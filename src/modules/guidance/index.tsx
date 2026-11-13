import { ReadDashboard } from '../../components/home/ReadDashboard';
import { PageHeader } from '../../components/ui/common';
import { DailyHadithCard } from './DailyHadithCard';
import { DailyPracticeCard } from './DailyPracticeCard';

export default function JourneyPage() {
  return (
    <div className="page-enter space-y-3">
      <PageHeader
        title="Mishka"
        subtitle="A daily rhythm of Quran, reflection, and small acts of worship."
      />
      <ReadDashboard />
      <DailyHadithCard />
      <DailyPracticeCard />
    </div>
  );
}
