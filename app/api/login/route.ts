import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/session';
import { loginUsername, loginPassword } from "@/lib/config";


export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    const session = await getSession();

    if (username === loginUsername && password === loginPassword) {
      session.user = {
        userName: loginUsername,
        isLoggedIn: true,
      };
      await session.save();
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: 'An error occurred' }, { status: 500 });
  }
}
