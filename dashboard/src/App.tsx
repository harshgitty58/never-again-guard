import { useEffect, useState } from 'react';
import { loadDataset, type Dataset } from './data';
import Hero from './Hero';
import Starfield from './Starfield';
import { ActionAudit, HowItWorks, ProofSection, RunIt, VariantMap } from './sections';

export default function App() {
  const [data, setData] = useState<Dataset | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDataset().then(setData, (e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="state">
        <h1>Reports not found</h1>
        <p className="mono">{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="state">
        <p className="mono muted">loading verifier reports…</p>
      </div>
    );
  }

  return (
    <>
      <Starfield />
      <Hero data={data} />
      <main>
        <ProofSection data={data} />
        <VariantMap data={data} />
        <ActionAudit data={data} />
        <HowItWorks />
        <RunIt data={data} />
      </main>
    </>
  );
}
