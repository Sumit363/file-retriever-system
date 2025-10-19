import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";

export const sessionOptions = {
  password: (process.env.SECRET_COOKIE_PASSWORD as string) || "complex_password_at_least_32_characters_long",
  cookieName: "user-session",
  cookieOptions: {
    secure: false,
  },
};

interface UserSessionData {
  // Add your session properties here, for example:
  user: {
    userName: string;
    isLoggedIn: boolean;
  };
  // Add more fields as needed
}

export async function getSession(): Promise<IronSession<UserSessionData>> {
  const cookieStore: any = await cookies();
  const session = await getIronSession<UserSessionData>(cookieStore, sessionOptions);
  return session;
}
