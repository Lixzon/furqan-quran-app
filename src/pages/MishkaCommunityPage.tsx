import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/common';

export default function MishkaCommunityPage() {
  return (
    <div className="page-enter">
      <PageHeader title="Community Hub" subtitle="A place for good ideas and shared projects." />
      <section className="rounded-3xl border border-line bg-gradient-to-br from-[#0f4e45] via-[#154d50] to-[#263c53] p-6 text-white shadow-card">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
          <Icon name="users" size={24} />
        </div>
        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100">Coming in a later phase</p>
        <h2 className="mt-1 text-xl font-semibold">A place for good ideas.</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80">
          The community board is planned, but submissions and voting are not active yet. This space is reserved for reviewed project and event proposals; it will not be an open chat.
        </p>
      </section>
    </div>
  );
}
