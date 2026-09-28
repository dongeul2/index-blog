import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInWithGitHub } from "./sign-in";
import { getViewer } from "@/lib/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "로그인",
  robots: { index: false, follow: false },
};

type Search = { next?: string; error?: string };

/** 로그인 실패 사유를 사람 말로 옮깁니다. */
function reason(code: string | undefined, login: string | null): string | null {
  if (!code) return null;
  if (code === "not_admin") {
    return login
      ? `${login} 계정은 이 사이트의 관리자가 아닙니다. 다른 계정으로 로그인하세요.`
      : "이 계정은 이 사이트의 관리자가 아닙니다.";
  }
  if (code === "no_code") return "GitHub에서 인가 코드가 오지 않았습니다. 다시 시도해 주세요.";
  return code;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const next = sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/admin";

  const viewer = await getViewer();
  // 이미 관리자로 로그인되어 있으면 굳이 이 화면을 보여주지 않습니다.
  if (viewer?.isAdmin) redirect(next);

  const message = reason(sp.error, viewer?.login ?? null);

  return (
    <div className="page login">
      <div className="login__box">
        <h1 className="login__title">관리자 로그인</h1>
        <p className="login__desc">
          이 사이트의 관리자 한 사람만 들어옵니다. 회원가입도, 비밀번호도 없습니다.
        </p>

        <SignInWithGitHub next={next} />

        {message && (
          <Alert variant="danger" className="mt-6 text-left">
            <AlertTitle>로그인할 수 없습니다</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {viewer && !viewer.isAdmin && (
          <form action="/auth/signout" method="post" className="login__switch">
            <Button type="submit" variant="link" size="sm" className="px-0">
              다른 계정으로 로그인하기
            </Button>
          </form>
        )}

        <p className="login__back">
          <Link href="/">← 사이트로 돌아가기</Link>
        </p>
      </div>
    </div>
  );
}
