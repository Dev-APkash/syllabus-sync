import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div className="flex w-full flex-1 items-center justify-center py-6 md:py-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
