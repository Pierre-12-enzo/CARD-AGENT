// pages/dashboard/Overview.jsx - WITH RECHARTS GRAPHS
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { companyAPI, studentAPI, cardAPI, coWorkerAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

const Overview = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [time, setTime] = useState(new Date());
  const [stats, setStats] = useState({
    organizations: { total: 0, schools: 0, corporate: 0 },
    people: { total: 0, students: 0, employees: 0, newThisMonth: 0, withPhotos: 0, photoCoverage: 0 },
    cards: {
      generated: 0,
      pending: 0,
      recentlyGenerated: 0,
      successful: 0,
      failed: 0,
      uniquePeople: 0,
      batchGenerations: 0,
      singleGenerations: 0,
      successRate: 0
    },
    coWorkers: { total: 0, active: 0, pending: 0 },
    recentActivity: [],
    orgBreakdown: [],
    dailyStats: [],
    weeklyStats: []
  });

  // Colors for charts
  const COLORS = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca'];
  const CARD_COLORS = ['#dc2626', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

  useEffect(() => {
    fetchDashboardData();
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const [companyRes, groupedRes, cardsRes, coWorkersRes, historyStatsRes] = await Promise.allSettled([
        companyAPI.getDashboard(),
        studentAPI.getGroupedByOrganization(),
        cardAPI.getCardHistory({ limit: 10 }),
        coWorkerAPI.getAll({ limit: 100 }),
        cardAPI.getCardStatistics()
      ]);

      // Organizations & People from grouped data
      let orgTotal = 0, schoolsCount = 0, corporateCount = 0;
      let totalPeople = 0, totalStudents = 0, totalEmployees = 0, withPhotos = 0;
      let cardsGenerated = 0, pendingCards = 0;
      let orgBreakdown = [];

      if (groupedRes.status === 'fulfilled' && groupedRes.value?.success) {
        const data = groupedRes.value;
        totalStudents = data.summary?.totalStudents || 0;
        totalEmployees = data.summary?.totalEmployees || 0;
        totalPeople = data.summary?.totalPeople || 0;
        schoolsCount = data.summary?.schools || 0;
        corporateCount = data.summary?.companies || 0;
        orgTotal = data.summary?.totalOrganizations || 0;

        if (data.organizations) {
          orgBreakdown = data.organizations.map(org => ({
            name: org.organization?.name,
            type: org.organization?.type,
            logo: org.organization?.logo?.url || null,
            total: org.stats?.totalStudents || org.stats?.totalEmployees || 0,
            students: org.stats?.totalStudents || 0,
            employees: org.stats?.totalEmployees || 0,
            withPhotos: org.stats?.withPhotos || 0,
            cardsGenerated: org.stats?.cardsGenerated || 0,
            pendingCards: org.stats?.pendingCards || 0
          }));
          data.organizations.forEach(org => {
            withPhotos += org.stats?.withPhotos || 0;
            cardsGenerated += org.stats?.cardsGenerated || 0;
            pendingCards += org.stats?.pendingCards || 0;
          });
        }
      }

      const photoCoverage = totalPeople > 0 ? Math.round((withPhotos / totalPeople) * 100) : 0;

      // Card statistics
      let totalCardsGenerated = cardsGenerated;
      let successfulCards = 0;
      let failedCards = 0;
      let uniquePeopleCount = 0;
      let batchGenerations = 0;
      let singleGenerations = 0;
      let dailyStats = [];
      let weeklyStats = [];

      if (historyStatsRes.status === 'fulfilled' && historyStatsRes.value?.success) {
        const historyStats = historyStatsRes.value;
        totalCardsGenerated = historyStats.stats?.totalCards || cardsGenerated;
        successfulCards = historyStats.stats?.successfulCards || 0;
        failedCards = historyStats.stats?.failedCards || 0;
        uniquePeopleCount = historyStats.stats?.uniquePeopleCount || 0;
        batchGenerations = historyStats.stats?.batchGenerations || 0;
        singleGenerations = historyStats.stats?.singleGenerations || 0;
        dailyStats = historyStats.dailyStats || [];
        weeklyStats = historyStats.weeklyStats || [];
      }

      const successRate = (totalCardsGenerated > 0)
        ? Math.round((successfulCards / totalCardsGenerated) * 100)
        : 0;

      // Recent cards
      let recentCardList = [];
      if (cardsRes.status === 'fulfilled' && cardsRes.value?.success) {
        recentCardList = cardsRes.value.history || [];
      }

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      let newThisMonth = recentCardList.filter(card => new Date(card.createdAt) >= firstDayOfMonth).length;

      // Co-workers
      let coWorkerTotal = 0, coWorkerActive = 0, coWorkerPending = 0;
      if (coWorkersRes.status === 'fulfilled' && coWorkersRes.value?.success) {
        coWorkerTotal = coWorkersRes.value.count || 0;
        const list = coWorkersRes.value.coWorkers || [];
        coWorkerActive = list.filter(c => c.isActive).length;
        coWorkerPending = list.filter(c => !c.lastLogin).length;
      }

      // Format daily stats for charts - ensure dates are properly formatted
      const formattedDailyStats = dailyStats.slice(-7).map(day => ({
        ...day,
        date: day._id || day.date || 'N/A',
        displayDate: day._id ? day._id.slice(5) : (day.date ? day.date.slice(5) : 'N/A'),
        batch: day.batch || 0,
        single: day.single || 0,
        total: day.total || 0
      }));

      // Prepare pie chart data
      const cardTypeData = [
        { name: 'Batch Generations', value: batchGenerations || 0 },
        { name: 'Single Generations', value: singleGenerations || 0 }
      ];

      // Activity
      const activity = [
        totalPeople > 0 && {
          type: 'people',
          action: 'Total Records',
          description: `${totalPeople} students & employees across ${orgTotal} organizations`,
          time: 'Current',
          icon: 'pi pi-users',
          color: 'slate'
        },
        totalCardsGenerated > 0 && {
          type: 'card',
          action: 'Cards Generated',
          description: `${totalCardsGenerated} ID cards (${successfulCards} successful, ${failedCards} failed)`,
          time: 'Total',
          icon: 'pi pi-qrcode',
          color: 'red'
        },
        uniquePeopleCount > 0 && {
          type: 'unique',
          action: 'Unique Individuals',
          description: `${uniquePeopleCount} unique people have cards`,
          time: 'Total',
          icon: 'pi pi-user',
          color: 'green'
        },
        batchGenerations > 0 && {
          type: 'batch',
          action: 'Batch Generations',
          description: `${batchGenerations} batch ${batchGenerations === 1 ? 'job' : 'jobs'}`,
          time: 'Total',
          icon: 'pi pi-users',
          color: 'blue'
        },
        singleGenerations > 0 && {
          type: 'single',
          action: 'Single Generations',
          description: `${singleGenerations} individual cards`,
          time: 'Total',
          icon: 'pi pi-user',
          color: 'purple'
        },
        pendingCards > 0 && {
          type: 'pending',
          action: 'Pending Cards',
          description: `${pendingCards} cards yet to be generated`,
          time: 'Remaining',
          icon: 'pi pi-clock',
          color: 'amber'
        },
        coWorkerTotal > 0 && {
          type: 'staff',
          action: 'Team Members',
          description: `${coWorkerActive} active co-workers`,
          time: 'Active',
          icon: 'pi pi-user-plus',
          color: 'slate'
        },
        photoCoverage > 0 && {
          type: 'photos',
          action: 'Photo Coverage',
          description: `${photoCoverage}% of people have photos`,
          time: `${withPhotos}/${totalPeople}`,
          icon: 'pi pi-image',
          color: 'green'
        }
      ].filter(Boolean);

      setStats({
        organizations: { total: orgTotal, schools: schoolsCount, corporate: corporateCount },
        people: {
          total: totalPeople,
          students: totalStudents,
          employees: totalEmployees,
          newThisMonth,
          withPhotos,
          photoCoverage
        },
        cards: {
          generated: totalCardsGenerated,
          pending: pendingCards,
          recentlyGenerated: newThisMonth,
          successful: successfulCards,
          failed: failedCards,
          uniquePeople: uniquePeopleCount,
          batchGenerations: batchGenerations,
          singleGenerations: singleGenerations,
          successRate: successRate
        },
        coWorkers: { total: coWorkerTotal, active: coWorkerActive, pending: coWorkerPending },
        recentActivity: activity.slice(0, 8),
        orgBreakdown: orgBreakdown.slice(0, 5),
        dailyStats: formattedDailyStats,
        weeklyStats: weeklyStats.slice(0, 4)
      });

    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshData = () => fetchDashboardData(true);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-700 font-semibold text-lg">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Refresh Indicator */}
      {refreshing && (
        <div className="fixed top-20 right-4 z-50 bg-red-600 text-white px-4 py-2 rounded-xl shadow-lg flex items-center space-x-2 animate-slide-down">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Refreshing...</span>
        </div>
      )}

      {/* Hero Welcome Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-red-900 p-6 sm:p-8 text-white">
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3 mb-2 flex-wrap gap-2">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                  {user?.companyId?.name || 'CARD-AGENT'}
                </h1>
                <span className="px-3 py-1 bg-red-500/20 border border-red-400/30 rounded-full text-xs font-medium text-red-200">
                  ADMIN PANEL
                </span>
              </div>
              <p className="text-slate-300 text-sm sm:text-base lg:text-lg mb-4">
                Professional Card Generation System - Live Company Dashboard
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 bg-red-400 rounded-full animate-pulse"></div>
                  <span className="text-slate-300">Live Data Active</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="pi pi-clock text-slate-400"></i>
                  <span className="text-slate-300">{time.toLocaleTimeString()}</span>
                </div>
                <button onClick={refreshData}
                  className="flex items-center space-x-2 bg-red-600/50 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors text-sm">
                  <i className="pi pi-refresh text-xs"></i>
                  <span>Refresh</span>
                </button>
              </div>
            </div>
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-red-600 to-red-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-red-500/30 transform rotate-6">
              <i className="pi pi-id-card text-white text-2xl sm:text-3xl lg:text-4xl"></i>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-red-500/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-slate-500/10 rounded-full blur-2xl"></div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Organizations"
          value={stats.organizations.total}
          subtitle={`${stats.organizations.schools} schools • ${stats.organizations.corporate} corporate`}
          icon="pi pi-building"
          gradient="from-slate-700 to-slate-800"
          link="/dashboard/organizations"
        />
        <MetricCard
          title="Total People"
          value={stats.people.total}
          subtitle={`${stats.people.students} students • ${stats.people.employees} employees`}
          icon="pi pi-users"
          gradient="from-red-600 to-red-500"
          link="/dashboard/students"
          detail={`${stats.people.newThisMonth} new this month`}
        />
        <MetricCard
          title="Cards Generated"
          value={stats.cards.generated}
          subtitle={`${stats.cards.successRate}% success • ${stats.cards.pending} pending`}
          icon="pi pi-qrcode"
          gradient="from-slate-800 to-slate-700"
          link="/dashboard/card-studio"
        />
        <MetricCard
          title="Co-Workers"
          value={stats.coWorkers.total}
          subtitle={`${stats.coWorkers.active} active • ${stats.coWorkers.pending} pending`}
          icon="pi pi-user-plus"
          gradient="from-red-700 to-red-600"
          link="/dashboard/co-workers"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Generation Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Daily Card Generation</h3>
              <p className="text-xs text-slate-500">Last 7 days trend</p>
            </div>
            <i className="pi pi-chart-line text-red-500 text-lg"></i>
          </div>
          {stats.dailyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={stats.dailyStats}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="colorBatch" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="colorSingle" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 12px'
                  }}
                  formatter={(value, name) => {
                    const labels = { total: 'Total', batch: 'Batch', single: 'Single' };
                    return [value, labels[name] || name];
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#dc2626"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                  name="Total"
                />
                <Area
                  type="monotone"
                  dataKey="batch"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorBatch)"
                  name="Batch"
                />
                <Area
                  type="monotone"
                  dataKey="single"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSingle)"
                  name="Single"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-slate-400">
              <div className="text-center">
                <i className="pi pi-chart-line text-3xl mb-2 block"></i>
                <p className="text-sm">No card generation data available yet</p>
              </div>
            </div>
          )}
        </div>

        {/* Card Type Distribution */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Generation Type</h3>
              <p className="text-xs text-slate-500">Batch vs Single distribution</p>
            </div>
            <i className="pi pi-chart-pie text-red-500 text-lg"></i>
          </div>
          {stats.cards.batchGenerations > 0 || stats.cards.singleGenerations > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Batch', value: stats.cards.batchGenerations },
                    { name: 'Single', value: stats.cards.singleGenerations }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#8b5cf6" />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 12px'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-slate-400">
              <div className="text-center">
                <i className="pi pi-chart-pie text-3xl mb-2 block"></i>
                <p className="text-sm">No card type data available</p>
              </div>
            </div>
          )}
          <div className="mt-2 flex justify-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              <span className="text-slate-600">Batch: {stats.cards.batchGenerations}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
              <span className="text-slate-600">Single: {stats.cards.singleGenerations}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Organization Stats Bar Chart */}
      {stats.orgBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Organization Performance</h3>
              <p className="text-xs text-slate-500">Cards vs People per organization</p>
            </div>
            <Link to="/dashboard/organizations" className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center space-x-1">
              <span>View All</span>
              <i className="pi pi-arrow-right text-xs"></i>
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.orgBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tick={{ fontSize: 10 }} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 12px'
                }}
              />
              <Legend />
              <Bar dataKey="total" fill="#a52525" name="People" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cardsGenerated" fill="#326fd1" name="Cards" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Quick Actions & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800">Quick Actions</h3>
              <i className="pi pi-bolt text-red-500 text-lg"></i>
            </div>
            <div className="space-y-3">
              <ActionCard
                title="Generate ID Cards"
                description="Batch process cards for any organization"
                icon="pi pi-qrcode"
                color="red"
                to="/dashboard/card-studio"
              />
              <ActionCard
                title="Add Organization"
                description="Register a new school or company client"
                icon="pi pi-building"
                color="slate"
                to="/dashboard/organizations"
              />
              <ActionCard
                title="Manage Students"
                description="Add, edit, or import student records"
                icon="pi pi-users"
                color="slate"
                to="/dashboard/students"
              />
              <ActionCard
                title="Invite Co-Worker"
                description="Add team members with permissions"
                icon="pi pi-user-plus"
                color="red"
                to="/dashboard/co-workers"
              />
            </div>
          </div>

          {/* System Status */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-lg p-6 text-white">
            <h3 className="text-lg font-bold mb-4">System Status</h3>
            <div className="space-y-3">
              <StatusItem label="Database" status="connected" />
              <StatusItem label="Card Service" status="operational" />
              <StatusItem label="Cloud Storage" status="connected" />
              <StatusItem label="Authentication" status="authenticated" />
              <StatusItem label="Real-time Updates" status="active" />
              <StatusItem label="License" status={stats.organizations.total > 0 ? 'active' : 'pending'} />
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-400 text-center">
                Last refreshed: {time.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-slate-800">Recent Activity</h3>
            <i className="pi pi-history text-red-500 text-lg"></i>
          </div>
          <div className="space-y-3 overflow-y-auto">
            {stats.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-4 p-3 rounded-xl bg-slate-50 hover:bg-white transition-colors border border-slate-100">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${activity.color === 'red' ? 'bg-red-100 text-red-600' :
                  activity.color === 'amber' ? 'bg-amber-100 text-amber-600' :
                    activity.color === 'green' ? 'bg-green-100 text-green-600' :
                      activity.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                        activity.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                          'bg-slate-100 text-slate-600'
                  }`}>
                  <i className={`${activity.icon} text-sm`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{activity.action}</p>
                  <p className="text-xs text-slate-500">{activity.description} • {activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== SUB-COMPONENTS =====

const MetricCard = ({ title, value, subtitle, icon, gradient, link, detail }) => (
  <Link to={link} className="block group">
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-5 hover:shadow-xl hover:border-red-200 transition-all duration-300 h-full">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-11 h-11 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <i className={`${icon} text-white text-lg`}></i>
        </div>
        <i className="pi pi-arrow-up-right text-slate-300 group-hover:text-red-500 transition-colors text-sm"></i>
      </div>
      <h4 className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">{title}</h4>
      <p className="text-2xl sm:text-3xl font-bold text-slate-900">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
      {detail && <p className="text-xs text-slate-400 mt-0.5">{detail}</p>}
    </div>
  </Link>
);

const ActionCard = ({ title, description, icon, color, to }) => (
  <Link to={to}
    className={`w-full text-left p-4 rounded-xl border transition-all duration-300 group ${color === 'red'
      ? 'bg-red-50/50 border-red-200 hover:bg-red-50 hover:border-red-300 hover:shadow-lg'
      : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-lg'
      }`}>
    <div className="flex items-center space-x-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${color === 'red' ? 'bg-red-600 text-white' : 'bg-slate-700 text-white'
        }`}>
        <i className={`${icon} text-base`}></i>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-slate-800 text-sm">{title}</h4>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <i className={`pi pi-chevron-right text-sm ${color === 'red' ? 'text-red-400' : 'text-slate-400'} group-hover:translate-x-1 transition-transform`}></i>
    </div>
  </Link>
);

const StatusItem = ({ label, status }) => {
  const getStatusStyle = (status) => {
    switch (status) {
      case 'connected': case 'operational': case 'authenticated': case 'active':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'pending': case 'ready':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-300">{label}</span>
      <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusStyle(status)}`}>
        {status}
      </span>
    </div>
  );
};

export default Overview;