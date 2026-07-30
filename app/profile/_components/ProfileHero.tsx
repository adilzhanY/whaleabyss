"use client";

import Image from "next/image";
import Link from "next/link";
import { Anchor, Pencil, ShieldCheck, Wrench } from "lucide-react";
import AvatarEditor from "@/components/AvatarEditor";
import valleHappy from "@/public/images/valle_chibi_happy.png";
import { formatMonthYear } from "./ui";

/** Adventure Rank tops out at 60 — the ring is progress toward that cap. */
const AR_MAX = 60;
/** 2πr for the r=46 circle below, used for the stroke-dash progress trick. */
const RING_LENGTH = 2 * Math.PI * 46;

export interface HeroUser {
  username: string;
  email: string;
  avatarUrl: string | null;
  adventureRank: number | null;
  role: string | null;
  createdAt: string | null;
}

function Badge({
  icon,
  children,
  tone = "blue",
  href,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  tone?: "blue" | "slate";
  href?: string;
}) {
  const cls =
    tone === "blue"
      ? "bg-blue-50 text-[#0B5191]"
      : "bg-slate-100 text-slate-600";
  const content = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-bold ${cls}`}
    >
      {icon}
      {children}
    </span>
  );
  return href ? (
    <Link href={href} className="transition-opacity hover:opacity-80">
      {content}
    </Link>
  ) : (
    content
  );
}

export default function ProfileHero({
  user,
  providers,
  onEdit,
  onAvatarUpload,
}: {
  user: HeroUser;
  providers: string[];
  onEdit: () => void;
  onAvatarUpload: (url: string) => void;
}) {
  const ar = user.adventureRank;
  const memberSince = formatMonthYear(user.createdAt);

  return (
    <section
      className="overflow-hidden border border-slate-200 bg-white shadow-sm"
      style={{ borderRadius: "var(--r-surface)" }}
    >
      {/* The abyss: a depth gradient with the star field screened over it. */}
      <div className="relative h-28 overflow-hidden sm:h-36">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,#071c33_0%,#0B5191_55%,#1e3a8a_100%)]" />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-35 mix-blend-screen"
          style={{ backgroundImage: "url('/images/stars_background.jpg')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_30%,rgba(7,28,51,0.45))]" />
        <Image
          src={valleHappy}
          alt=""
          className="absolute -bottom-2 right-3 h-auto w-20 drop-shadow-[0_4px_10px_rgba(7,28,51,0.45)] sm:right-6 sm:w-28"
          priority
        />
      </div>

      <div className="flex flex-wrap items-end gap-x-5 gap-y-4 px-5 pb-5 sm:px-8 sm:pb-6">
        <div className="relative -mt-12 grid shrink-0 place-items-center sm:-mt-16">
          {/* Ring sized well clear of AvatarEditor (96/128px plus its 4px
              border) — at equal radii it hid exactly behind that border. */}
          {ar != null && (
            <svg
              viewBox="0 0 100 100"
              className="pointer-events-none absolute h-[124px] w-[124px] -rotate-90 sm:h-[164px] sm:w-[164px]"
              aria-hidden="true"
            >
              <circle cx="50" cy="50" r="46" fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="#0B5191"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={RING_LENGTH}
                strokeDashoffset={RING_LENGTH * (1 - Math.min(ar, AR_MAX) / AR_MAX)}
                pathLength={RING_LENGTH}
              />
            </svg>
          )}
          <AvatarEditor
            currentAvatarUrl={user.avatarUrl}
            userName={user.username}
            onUploadSuccess={onAvatarUpload}
          />
          {/* Only the short filled chip sits on the avatar — a longer label
              would run under AvatarEditor's edit button at bottom-right. */}
          {ar != null && (
            <span
              className="absolute -bottom-2 rounded-full bg-[#0B5191] px-2.5 py-0.5 text-[10.5px] font-extrabold text-white shadow-[0_2px_6px_rgba(11,81,145,0.45)]"
              title="Ранг приключений"
            >
              AR {ar}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 basis-56 pt-3">
          <h1 className="truncate text-2xl font-black text-blue-950 sm:text-3xl">
            {user.username}
          </h1>
          <p className="mb-2.5 truncate text-[13px] text-slate-500">{user.email}</p>
          <div className="flex flex-wrap items-center gap-2">
            {memberSince && (
              <Badge icon={<Anchor className="h-3 w-3" strokeWidth={2.5} />}>
                С нами с {memberSince}
              </Badge>
            )}
            {ar == null && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11.5px] font-bold text-slate-600 transition-colors hover:text-[#0B5191]"
              >
                <Pencil className="h-3 w-3" strokeWidth={2.5} />
                Указать ранг приключений
              </button>
            )}
            {providers.includes("yandex") && <Badge tone="slate">Яндекс ID привязан</Badge>}
            {user.role === "admin" && (
              <Badge
                tone="slate"
                href="/admin"
                icon={<ShieldCheck className="h-3 w-3" strokeWidth={2.5} />}
              >
                Админ-панель
              </Badge>
            )}
            {user.role === "booster" && (
              <Badge
                tone="slate"
                href="/portal"
                icon={<Wrench className="h-3 w-3" strokeWidth={2.5} />}
              >
                Портал бустера
              </Badge>
            )}
          </div>
        </div>

        <button type="button" onClick={onEdit} className="btn-outline btn-sm">
          <Pencil className="h-3.5 w-3.5" />
          Редактировать
        </button>
      </div>
    </section>
  );
}
