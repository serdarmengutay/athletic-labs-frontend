import { AthleteReportResponse } from "@/types/report";
import RadarChart from "@/components/charts/RadarChart";
import PerformanceBarChart from "@/components/charts/PerformanceBarChart";
import { TrendingUp, Activity, Target, Award } from "lucide-react";

interface AthleteReportProps {
  report: AthleteReportResponse;
}

export default function AthleteReport({ report }: AthleteReportProps) {
  return (
    <div className="min-h-screen bg-[#0a0e27] text-white p-8">
      {/* Athlete Header Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {report.athlete.fullName}
            </h2>
            <div className="flex items-center space-x-4 text-slate-400">
              <span>{report.athlete.birthYear} doğumlu</span>
              <span>•</span>
              <span>{report.athlete.age} yaş</span>
              <span>•</span>
              <span>{report.testSession.clubName}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg px-4 py-2">
              <div className="text-[#00ff88] text-3xl font-bold">
                {report.percentileRank}
              </div>
              <div className="text-slate-400 text-sm">Percentile</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Physical Measurements */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <Activity className="h-5 w-5 text-[#00ff88]" />
            <span>Fiziksel Ölçümler</span>
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-400">Boy</span>
              <span className="text-white font-semibold">
                {report.physicalMeasurements.height} cm
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-400">Kilo</span>
              <span className="text-white font-semibold">
                {report.physicalMeasurements.weight} kg
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-400">FFMI</span>
              <div className="text-right">
                <span className="text-white font-semibold">
                  {report.physicalMeasurements.ffmi.toFixed(1)}
                </span>
                <span className="ml-2 text-xs text-[#00ff88] bg-[#00ff88]/10 px-2 py-1 rounded">
                  {report.physicalMeasurements.ffmiCategory}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Tests */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-[#00ff88]" />
            <span>Performans Testleri</span>
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-400">30m Sprint (En İyi)</span>
              <span className="text-white font-semibold">
                {report.performanceTests.sprint30mBest.toFixed(2)} sn
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-400">Çeviklik</span>
              <span className="text-white font-semibold">
                {report.performanceTests.agility.toFixed(2)} sn
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-400">Dikey Sıçrama</span>
              <span className="text-white font-semibold">
                {report.performanceTests.verticalJump} cm
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-400">Esneklik</span>
              <span className="text-white font-semibold">
                {report.performanceTests.flexibility} cm
              </span>
            </div>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            Yaş Grubu Karşılaştırması
          </h3>
          <RadarChart
            categories={report.radarChartData.categories}
            athleteValues={report.radarChartData.athleteValues}
            ageGroupAverage={report.radarChartData.ageGroupAverage}
          />
        </div>

        {/* Bar Chart */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            Detaylı Karşılaştırma
          </h3>
          <PerformanceBarChart data={report.barChartData} />
        </div>

        {/* Fatigue Index */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <Activity className="h-5 w-5 text-[#00ff88]" />
            <span>Yorgunluk İndeksi</span>
          </h3>
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400">Sprint Farkı</span>
              <span className="text-2xl font-bold text-[#00ff88]">
                {report.fatigueIndex.value.toFixed(1)}%
              </span>
            </div>
            <p className="text-slate-400 text-sm">
              {report.fatigueIndex.interpretation}
            </p>
          </div>
          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-slate-300 leading-relaxed">
              {report.insights.ffmiExplanation}
            </p>
          </div>
        </div>

        {/* 4-Month Targets */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <Target className="h-5 w-5 text-[#00ff88]" />
            <span>4 Aylık Hedefler</span>
          </h3>
          <div className="space-y-3">
            {report.fourMonthTargets.map((target, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-800/50 rounded-lg border-l-4 border-[#00ff88]"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white font-medium">
                    {target.category}
                  </span>
                  <span className="text-[#00ff88] font-semibold">
                    {target.currentValue} → {target.targetValue} {target.unit}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {target.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="mt-6 bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
          <Award className="h-5 w-5 text-[#00ff88]" />
          <span>Performans Özeti</span>
        </h3>
        <p className="text-slate-300 mb-4 leading-relaxed">
          {report.insights.performanceSummary}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <h4 className="text-green-400 font-semibold mb-2">Güçlü Yönler</h4>
            <ul className="space-y-1">
              {report.insights.strengths.map((strength, idx) => (
                <li
                  key={idx}
                  className="text-sm text-slate-300 flex items-start"
                >
                  <span className="text-green-400 mr-2">✓</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <h4 className="text-yellow-400 font-semibold mb-2">
              Gelişim Alanları
            </h4>
            <ul className="space-y-1">
              {report.insights.areasForImprovement.map((area, idx) => (
                <li
                  key={idx}
                  className="text-sm text-slate-300 flex items-start"
                >
                  <span className="text-yellow-400 mr-2">→</span>
                  {area}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
