import Link from "next/link";

interface AddressSearchErrorProps {
  message: string;
  detail?: string;
}

export default function AddressSearchError({ message, detail }: AddressSearchErrorProps) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:py-24">
      <div className="card-premium p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="mt-4 text-lg font-bold text-slate-900">{message}</h1>
        {detail && <p className="mt-2 text-sm leading-relaxed text-slate-600">{detail}</p>}
        <Link href="/" className="btn-primary mt-6 inline-flex h-11 px-6 text-sm">
          주소 다시 입력하기
        </Link>
      </div>
    </div>
  );
}
