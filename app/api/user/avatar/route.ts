import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const s3Client = new S3Client({
  region: 'ru-central1',
  endpoint: 'https://storage.yandexcloud.net',
  credentials: {
    accessKeyId: process.env.YANDEX_KEY_ID as string,
    secretAccessKey: process.env.YANDEX_SECRET_KEY as string,
  },
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = crypto.randomBytes(16).toString('hex');
    const ext = file.name.split('.').pop();
    // @ts-ignore
    const fileName = `user_avatars/${session.user.id}_${hash}.${ext}`;

    const uploadParams = {
      Bucket: 'whaleabyss-bucket',
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    const avatarUrl = `https://storage.yandexcloud.net/whaleabyss-bucket/${fileName}`;
    // @ts-ignore
    await db.update(users).set({ avatarUrl }).where(eq(users.id, session.user.id));

    return NextResponse.json({ success: true, avatarUrl });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
  }
}