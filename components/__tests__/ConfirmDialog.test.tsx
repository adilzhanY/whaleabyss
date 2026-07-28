/**
 * Tests for the site-wide confirmation dialog.
 *
 * The dialog is a singleton driven by `confirmDialog()`, so these exercise the
 * public contract call sites depend on: the returned promise, the pending /
 * error lifecycle of an async action, and the dismissal rules.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmDialogHost from "@/components/ConfirmDialogHost";
import { confirmDialog, useConfirmStore } from "@/store/useConfirm";

/** A promise whose settlement this test controls. */
function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  useConfirmStore.setState({
    open: false,
    options: null,
    pending: false,
    error: null,
    resolver: null,
  });
});

afterEach(cleanup);

describe("rendering", () => {
  it("renders nothing until something asks for a confirmation", () => {
    render(<ConfirmDialogHost />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the title, description and custom labels", async () => {
    render(<ConfirmDialogHost />);
    act(() => {
      void confirmDialog({
        title: "Отвязать аккаунт?",
        description: "Качер потеряет доступ к порталу.",
        confirmLabel: "Отвязать",
        cancelLabel: "Не сейчас",
        variant: "danger",
      });
    });

    expect(await screen.findByText("Отвязать аккаунт?")).toBeInTheDocument();
    expect(screen.getByText("Качер потеряет доступ к порталу.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Отвязать" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Не сейчас" })).toBeInTheDocument();
  });

  it("defaults the danger confirm label to «Удалить»", async () => {
    render(<ConfirmDialogHost />);
    act(() => {
      void confirmDialog({ title: "Удалить это событие?", variant: "danger" });
    });
    expect(await screen.findByRole("button", { name: "Удалить" })).toBeInTheDocument();
  });
});

describe("resolution", () => {
  it("resolves true when confirmed", async () => {
    const user = userEvent.setup();
    render(<ConfirmDialogHost />);
    let result: boolean | undefined;
    act(() => {
      void confirmDialog({ title: "Продолжить?" }).then((v) => (result = v));
    });

    await user.click(await screen.findByRole("button", { name: "Подтвердить" }));
    await waitFor(() => expect(result).toBe(true));
    await waitFor(() => expect(useConfirmStore.getState().open).toBe(false));
  });

  it("resolves false when cancelled", async () => {
    const user = userEvent.setup();
    render(<ConfirmDialogHost />);
    let result: boolean | undefined;
    act(() => {
      void confirmDialog({ title: "Продолжить?" }).then((v) => (result = v));
    });

    await user.click(await screen.findByRole("button", { name: "Отмена" }));
    await waitFor(() => expect(result).toBe(false));
  });

  it("resolves false on Escape", async () => {
    const user = userEvent.setup();
    render(<ConfirmDialogHost />);
    let result: boolean | undefined;
    act(() => {
      void confirmDialog({ title: "Продолжить?" }).then((v) => (result = v));
    });
    await screen.findByText("Продолжить?");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(result).toBe(false));
  });

  it("resolves the previous request as cancelled when a second one opens", async () => {
    render(<ConfirmDialogHost />);
    let first: boolean | undefined;
    act(() => {
      void confirmDialog({ title: "Первый" }).then((v) => (first = v));
    });
    await screen.findByText("Первый");

    act(() => {
      void confirmDialog({ title: "Второй" });
    });

    // No stranded promise, and the newest question is the one on screen.
    await waitFor(() => expect(first).toBe(false));
    expect(await screen.findByText("Второй")).toBeInTheDocument();
  });
});

describe("async action", () => {
  it("keeps the dialog open with a spinner until the action settles", async () => {
    const user = userEvent.setup();
    const gate = deferred();
    const action = vi.fn(() => gate.promise);
    render(<ConfirmDialogHost />);
    let result: boolean | undefined;
    act(() => {
      void confirmDialog({ title: "Удалить заказ?", variant: "danger", action }).then(
        (v) => (result = v)
      );
    });

    await user.click(await screen.findByRole("button", { name: "Удалить" }));

    // Still open, confirm button busy, nothing resolved yet.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Удалить/ })).toHaveAttribute(
        "aria-busy",
        "true"
      )
    );
    expect(result).toBeUndefined();
    expect(screen.getByText("Удалить заказ?")).toBeInTheDocument();

    await act(async () => {
      gate.resolve();
      await gate.promise;
    });

    await waitFor(() => expect(result).toBe(true));
    await waitFor(() => expect(useConfirmStore.getState().open).toBe(false));
  });

  it("shows the error and stays open when the action fails", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockRejectedValue(new Error("Сервер недоступен"));
    render(<ConfirmDialogHost />);
    let result: boolean | undefined;
    act(() => {
      void confirmDialog({ title: "Удалить заказ?", variant: "danger", action }).then(
        (v) => (result = v)
      );
    });

    await user.click(await screen.findByRole("button", { name: "Удалить" }));

    // The failure is surfaced, the dialog stays up, the promise is unresolved
    // so the caller can't mistake a failure for a success.
    expect(await screen.findByRole("alert")).toHaveTextContent("Сервер недоступен");
    expect(useConfirmStore.getState().open).toBe(true);
    expect(result).toBeUndefined();

    // A retry is possible; cancelling now resolves false.
    await user.click(screen.getByRole("button", { name: "Отмена" }));
    await waitFor(() => expect(result).toBe(false));
  });

  it("falls back to a generic message when the failure carries none", async () => {
    const user = userEvent.setup();
    render(<ConfirmDialogHost />);
    act(() => {
      void confirmDialog({
        title: "Удалить?",
        variant: "danger",
        action: () => Promise.reject(new Error("")),
      });
    });

    await user.click(await screen.findByRole("button", { name: "Удалить" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Не удалось выполнить действие"
    );
  });

  it("cannot be dismissed while the action is running", async () => {
    const user = userEvent.setup();
    const gate = deferred();
    render(<ConfirmDialogHost />);
    let result: boolean | undefined;
    act(() => {
      void confirmDialog({
        title: "Удалить заказ?",
        variant: "danger",
        action: () => gate.promise,
      }).then((v) => (result = v));
    });

    await user.click(await screen.findByRole("button", { name: "Удалить" }));
    await waitFor(() => expect(useConfirmStore.getState().pending).toBe(true));

    await user.keyboard("{Escape}");
    expect(useConfirmStore.getState().open).toBe(true);
    expect(result).toBeUndefined();

    await act(async () => {
      gate.resolve();
      await gate.promise;
    });
    await waitFor(() => expect(result).toBe(true));
  });

  it("ignores a double click on confirm (one action run, not two)", async () => {
    const user = userEvent.setup();
    const gate = deferred();
    const action = vi.fn(() => gate.promise);
    render(<ConfirmDialogHost />);
    act(() => {
      void confirmDialog({ title: "Удалить?", variant: "danger", action });
    });

    const button = await screen.findByRole("button", { name: "Удалить" });
    await user.click(button);
    await user.click(button).catch(() => {});

    expect(action).toHaveBeenCalledTimes(1);
    await act(async () => {
      gate.resolve();
      await gate.promise;
    });
  });
});
