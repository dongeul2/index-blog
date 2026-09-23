"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

/**
 * GitHub으로 로그인.
 *
 * 돌아올 주소를 하드코딩하지 않고 현재 origin에서 유도합니다. 그래야 로컬·프리뷰·프로덕션이
 * 코드 변경 없이 모두 동작하고, 도메인이 바뀌어도 Supabase의 Redirect URLs에 한 줄만
 * 더하면 됩니다.
 */
export function SignInWithGitHub({ next }: { next: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setError(null);

    const supabase = createClient();
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: callback.toString() },
    });

    if (error) {
      setError(error.message);
      setPending(false);
    }
    // 성공하면 브라우저가 GitHub으로 넘어가므로 여기로 돌아오지 않습니다.
  }

  return (
    <>
      <Button type="button" className="mt-8 w-full" onClick={signIn} disabled={pending}>
        {pending ? "GitHub으로 이동 중…" : "GitHub으로 로그인"}
      </Button>

      <p className="mt-3 min-h-5 text-caption text-danger" role="status" aria-live="polite">
        {error}
      </p>
    </>
  );
}
