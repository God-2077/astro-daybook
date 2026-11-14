import { useEffect, useState } from 'react';

export default function CurrentDate() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return <time dateTime={now?.toISOString()}>{now ? now.toLocaleString('zh-CN') : '…'}</time>;
}
