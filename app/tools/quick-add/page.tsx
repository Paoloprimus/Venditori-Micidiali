// app/tools/quick-add/page.tsx
import dynamic from 'next/dynamic';

// IMPORTANTISSIMO: niente oggetti qui.
// Valori validi: numero (es. 0) oppure false.
export const revalidate = false;

const QuickAddClient = dynamic(() => import('./QuickAddClient'), { ssr: false });

export default function Page() {
  return <QuickAddClient />;
}
