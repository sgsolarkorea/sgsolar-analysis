import FloatingConsultButton from "@/components/layout/FloatingConsultButton";

export default function ResultLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FloatingConsultButton />
    </>
  );
}
