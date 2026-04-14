import { Logo } from "./_components/Logo";

export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Logo className="h-12 w-12 animate-spin text-white" />
    </div>
  );
}
