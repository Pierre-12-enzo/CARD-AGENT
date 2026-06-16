// pages/co-worker/Overview.jsx - ENHANCED WITH PROFESSIONAL QUICK STATS & CHARTS
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { studentAPI, cardAPI, organizationAPI } from '../../services/api';
import {
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

const CoWorkerOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    assignedOrgs: [],
    totalStudents: 0,
    totalCards: 0,
    recentActivity: [],
    cardsByType: { batch: 0, single: 0 },
    dailyStats: []
  });
  const [orgStats, setOrgStats] = useState({});

  useEffect(() => {
    fetchOverview();
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchOverview = async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const perms = user?.permissions || [];

      // Get stats for each assigned org
      const orgStatsData = await Promise.all(perms.map(async (perm) => {
        try {
          const res = await studentAPI.getByOrganization(perm.organizationId, { limit: 1 });
          const totalPeople = res?.pagination?.total || 0;

          const orgRes = await organizationAPI.getById(perm.organizationId);
          const orgName = orgRes.success ? orgRes.organization?.name : perm.organizationName || 'Unknown';

          return {
            ...perm,
            organizationId: perm.organizationId,
            organizationName: orgName,
            totalPeople,
            type: orgRes.success ? orgRes.organization?.type : 'unknown'
          };
        } catch (e) {
          return {
            ...perm,
            totalPeople: 0,
            type: 'unknown'
          };
        }
      }));

      const totalStudents = orgStatsData.reduce((sum, o) => sum + o.totalPeople, 0);

      // Cards count - get both total and breakdown
      let totalCards = 0;
      let batchGenerations = 0;
      let singleGenerations = 0;
      let dailyStats = [];
      let successfulCards = 0;
      let failedCards = 0;
      let uniquePeopleCount = 0;
      let successRate = 0;

      try {
        const cardsRes = await cardAPI.getCardStatistics();
        if (cardsRes.success) {
          totalCards = cardsRes.stats?.totalCards || 0;
          batchGenerations = cardsRes.stats?.batchGenerations || 0;
          singleGenerations = cardsRes.stats?.singleGenerations || 0;
          successfulCards = cardsRes.stats?.successfulCards || 0;
          failedCards = cardsRes.stats?.failedCards || 0;
          uniquePeopleCount = cardsRes.stats?.uniquePeopleCount || 0;
          dailyStats = cardsRes.dailyStats || [];

          successRate = totalCards > 0
            ? Math.round((successfulCards / totalCards) * 100)
            : 0;
        }
      } catch (e) {
        console.warn('Could not fetch card stats:', e);
      }

      // Format daily stats for charts
      const formattedDailyStats = dailyStats.slice(-7).map(day => ({
        ...day,
        date: day._id || day.date || 'N/A',
        displayDate: day._id ? day._id.slice(5) : (day.date ? day.date.slice(5) : 'N/A'),
        batch: day.batch || 0,
        single: day.single || 0,
        total: day.total || 0
      }));

      // Build activity based on actual permissions
      const activity = [];

      if (orgStatsData.length > 0) {
        activity.push({
          action: `${orgStatsData.length} organization(s) assigned`,
          time: 'Active',
          icon: 'pi-building',
          color: 'red'
        });
      }

      activity.push({
        action: `${totalStudents} total records under your management`,
        time: 'Current',
        icon: 'pi-users',
        color: 'slate'
      });

      if (totalCards > 0) {
        activity.push({
          action: `${totalCards} cards generated`,
          time: 'Total',
          icon: 'pi-qrcode',
          color: 'purple'
        });

        if (successRate > 0) {
          activity.push({
            action: `${successRate}% success rate`,
            time: 'Performance',
            icon: 'pi-chart-line',
            color: 'green'
          });
        }
      }

      // Add permission-based activities
      const hasCardGen = orgStatsData.some(o => o.canGenerateCards);
      if (hasCardGen) {
        activity.push({
          action: 'Card generation access granted',
          time: 'Active',
          icon: 'pi-qrcode',
          color: 'red'
        });
      }

      const hasStudentMgmt = orgStatsData.some(o => o.canManageStudents);
      if (hasStudentMgmt) {
        activity.push({
          action: 'Student management access granted',
          time: 'Active',
          icon: 'pi-users',
          color: 'slate'
        });
      }

      setStats({
        assignedOrgs: orgStatsData,
        totalStudents,
        totalCards,
        recentActivity: activity,
        cardsByType: {
          batch: batchGenerations,
          single: singleGenerations,
          successful: successfulCards,
          failed: failedCards,
          uniquePeople: uniquePeopleCount,
          successRate: successRate
        },
        dailyStats: formattedDailyStats
      });

      // Store org-specific stats
      const statsMap = {};
      for (const org of orgStatsData) {
        try {
          const statsRes = await studentAPI.getStats({ organizationId: org.organizationId });
          if (statsRes.success) {
            statsMap[org.organizationId] = statsRes.stats;
          }
        } catch (e) {
          console.error(`Failed to get stats for ${org.organizationId}:`, e);
        }
      }
      setOrgStats(statsMap);

    } catch (error) {
      console.error('Error fetching overview:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshData = () => fetchOverview(true);

  const permissions = user?.permissions || [];

  // Get unique permission types across all orgs
  const activePermissions = [
    ...new Set(permissions.flatMap(p =>
      Object.entries(p).filter(([k, v]) => v && k.startsWith('can')).map(([k]) => k)
    ))
  ];

  const permissionList = [
    { key: 'canGenerateCards', label: 'Generate Cards', icon: 'pi-qrcode', description: 'Create and print ID cards', color: 'red' },
    { key: 'canManageStudents', label: 'Manage Students', icon: 'pi-users', description: 'Add, edit, and remove records', color: 'slate' },
    { key: 'canManageTemplates', label: 'Manage Templates', icon: 'pi-image', description: 'Design card templates', color: 'slate' },
    { key: 'canUploadCSV', label: 'Bulk Import', icon: 'pi-file-excel', description: 'Import data via CSV', color: 'amber' },
    { key: 'canUploadPhotos', label: 'Upload Photos', icon: 'pi-camera', description: 'Manage photos', color: 'green' },
    { key: 'canViewAnalytics', label: 'View Analytics', icon: 'pi-chart-line', description: 'Access statistics', color: 'slate' },
    { key: 'canViewAuditLogs', label: 'View Audit Logs', icon: 'pi-history', description: 'Track activity', color: 'slate' },
  ];

  const userPermissions = permissionList.filter(p => activePermissions.includes(p.key));

  // Build quick actions based on permissions
  const quickActions = [];
  if (activePermissions.includes('canGenerateCards')) quickActions.push({ label: 'Generate Cards', icon: 'pi-qrcode', path: '/co-worker/cards', color: 'red' });
  if (activePermissions.includes('canManageStudents')) quickActions.push({ label: 'Manage Students', icon: 'pi-users', path: '/co-worker/students', color: 'slate' });
  if (activePermissions.includes('canManageTemplates')) quickActions.push({ label: 'Manage Templates', icon: 'pi-image', path: '/co-worker/templates', color: 'slate' });
  if (activePermissions.includes('canUploadCSV')) quickActions.push({ label: 'Bulk Import', icon: 'pi-upload', path: '/co-worker/bulk-import', color: 'amber' });
  if (activePermissions.includes('canUploadPhotos')) quickActions.push({ label: 'Upload Photos', icon: 'pi-camera', path: '/co-worker/photos', color: 'green' });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getInitials = () => `${user?.firstName?.charAt(0) || ''}${user?.lastName?.charAt(0) || ''}`.toUpperCase();

  // Helper to get permission badge color
  const getBadgeColor = (permKey) => {
    const colors = {
      canGenerateCards: 'bg-red-100 text-red-700',
      canManageStudents: 'bg-blue-100 text-blue-700',
      canManageTemplates: 'bg-purple-100 text-purple-700',
      canUploadCSV: 'bg-amber-100 text-amber-700',
      canUploadPhotos: 'bg-green-100 text-green-700',
      canViewAnalytics: 'bg-indigo-100 text-indigo-700',
      canViewAuditLogs: 'bg-slate-100 text-slate-700'
    };
    return colors[permKey] || 'bg-slate-100 text-slate-600';
  };

  // Helper to get permission label
  const getPermissionLabel = (permKey) => {
    const labels = {
      canGenerateCards: 'Generate Cards',
      canManageStudents: 'Manage Students',
      canManageTemplates: 'Manage Templates',
      canUploadCSV: 'Bulk Import',
      canUploadPhotos: 'Upload Photos',
      canViewAnalytics: 'View Analytics',
      canViewAuditLogs: 'Audit Logs'
    };
    return labels[permKey] || permKey;
  };

  // Prepare pie chart data for card types
  const cardTypeData = [
    { name: 'Batch', value: stats.cardsByType.batch || 0 },
    { name: 'Single', value: stats.cardsByType.single || 0 }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-700 font-semibold">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Refresh Indicator */}
      {refreshing && (
        <div className="fixed top-20 right-4 z-50 bg-red-600 text-white px-4 py-2 rounded-xl shadow-lg flex items-center space-x-2 animate-slide-down">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Refreshing...</span>
        </div>
      )}

      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-red-900 p-6 text-white">
        <div className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <span className="text-2xl font-bold">{getInitials()}</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">{getGreeting()}, {user?.firstName}!</h1>
                <p className="text-slate-300 text-sm mt-1">
                  Welcome to your workspace • {time.toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="px-3 py-1 bg-white/20 rounded-full text-sm inline-block backdrop-blur-sm">
                <i className="pi pi-building mr-2"></i>
                {user?.companyId?.name || 'CARD-AGENT'}
              </div>
              <p className="text-slate-300 text-xs mt-2">
                <i className="pi pi-calendar mr-1"></i>
                {time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <button
                onClick={refreshData}
                className="mt-2 text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1"
              >
                <i className="pi pi-refresh text-xs"></i>
                Refresh
              </button>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/20 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-slate-500/10 rounded-full blur-2xl"></div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Company" value={user?.companyId?.name || 'N/A'} icon="pi-building" color="slate" subtitle="Your company" />
        <StatCard title="Your Role" value="CO-WORKER" icon="pi-user" color="red" subtitle={`${stats.assignedOrgs.length} organization(s)`} />
        <StatCard title="Assigned Orgs" value={stats.assignedOrgs.length} icon="pi-building" color="slate" subtitle="Organizations" />
        <StatCard title="Total Records" value={stats.totalStudents} icon="pi-users" color="red" subtitle="Under your access" />
      </div>

      {/* Professional Quick Stats Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Your Quick Statistics</h3>
            <p className="text-xs text-slate-500">Real-time overview of your card generation activity</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              Live
            </span>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Cards */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-200/50 hover:border-purple-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <i className="pi pi-qrcode text-white text-sm"></i>
                </div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cards</span>
              </div>
              <span className="text-xs font-bold text-purple-600">{stats.cardsByType.successRate}%</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.totalCards}</p>
                <p className="text-xs text-slate-500">
                  <span className="text-green-600">{stats.cardsByType.successful}</span> successful •
                  <span className="text-red-500 ml-1">{stats.cardsByType.failed}</span> failed
                </p>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-purple-600">{stats.cardsByType.uniquePeople}</span>
                <i className="pi pi-users text-purple-500 text-xs"></i>
              </div>
            </div>
          </div>

          {/* Generation Type */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200/50 hover:border-blue-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <i className="pi pi-chart-bar text-white text-sm"></i>
                </div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Generation</span>
              </div>
              <span className="text-xs font-bold text-blue-600">Types</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.cardsByType.batch + stats.cardsByType.single}</p>
                <p className="text-xs text-slate-500">
                  <span className="text-blue-600">{stats.cardsByType.batch}</span> batch •
                  <span className="text-purple-600 ml-1">{stats.cardsByType.single}</span> single
                </p>
              </div>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              </div>
            </div>
          </div>

          {/* Organizations */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-200/50 hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
                  <i className="pi pi-building text-white text-sm"></i>
                </div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Organizations</span>
              </div>
              <span className="text-xs font-bold text-slate-400">{stats.assignedOrgs.length}</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.assignedOrgs.length}</p>
                <p className="text-xs text-slate-500">
                  <span className="text-blue-600">{stats.assignedOrgs.filter(o => o.type !== 'corporate').length}</span> schools •
                  <span className="text-purple-600 ml-1">{stats.assignedOrgs.filter(o => o.type === 'corporate').length}</span> corporate
                </p>
              </div>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              </div>
            </div>
          </div>

          {/* People */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-4 border border-amber-200/50 hover:border-amber-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center">
                  <i className="pi pi-users text-white text-sm"></i>
                </div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">People</span>
              </div>
              <span className="text-xs font-bold text-amber-600">{stats.totalStudents}</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.totalStudents}</p>
                <p className="text-xs text-slate-500">
                  Under your management
                </p>
              </div>
              <div className="flex items-center gap-1">
                <i className="pi pi-users text-amber-500 text-xs"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Stats - Compact Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200/50">
            <p className="text-xs text-slate-500">Batch Generations</p>
            <p className="text-lg font-bold text-blue-600">{stats.cardsByType.batch}</p>
            <p className="text-[10px] text-slate-400">Multiple cards per batch</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200/50">
            <p className="text-xs text-slate-500">Single Generations</p>
            <p className="text-lg font-bold text-purple-600">{stats.cardsByType.single}</p>
            <p className="text-[10px] text-slate-400">Individual cards</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200/50">
            <p className="text-xs text-slate-500">Unique People</p>
            <p className="text-lg font-bold text-green-600">{stats.cardsByType.uniquePeople || 0}</p>
            <p className="text-[10px] text-slate-400">with cards generated</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200/50">
            <p className="text-xs text-slate-500">Success Rate</p>
            <p className="text-lg font-bold text-emerald-600">{stats.cardsByType.successRate || 0}%</p>
            <p className="text-[10px] text-slate-400">of cards successful</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      {stats.dailyStats.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Generation Trend */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Daily Card Generation</h3>
                <p className="text-xs text-slate-500">Last 7 days trend</p>
              </div>
              <i className="pi pi-chart-line text-red-500 text-lg"></i>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.dailyStats}>
                <defs>
                  <linearGradient id="coColorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0.1} />
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
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#dc2626"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#coColorTotal)"
                  name="Cards Generated"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Card Type Distribution - Pie Chart */}
          {(stats.cardsByType.batch > 0 || stats.cardsByType.single > 0) && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Generation Type</h3>
                  <p className="text-xs text-slate-500">Batch vs Single</p>
                </div>
                <i className="pi pi-chart-pie text-red-500 text-lg"></i>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={cardTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
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
            </div>
          )}
        </div>
      )}

      {/* Two Column Layout for Rest */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Permissions Card - Summary */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden">
            <div className="bg-gradient-to-r from-red-700 to-red-900 px-5 py-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Your Permissions</h3>
                <i className="pi pi-shield text-white text-xl"></i>
              </div>
              <p className="text-red-100 text-sm mt-1">Across all organizations</p>
            </div>
            <div className="p-5 space-y-3">
              {userPermissions.length > 0 ? (
                userPermissions.map((perm) => (
                  <div key={perm.key} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl hover:bg-red-50 transition-colors group">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${perm.color === 'red' ? 'bg-red-100 text-red-600' :
                      perm.color === 'amber' ? 'bg-amber-100 text-amber-600' :
                        perm.color === 'green' ? 'bg-green-100 text-green-600' :
                          'bg-slate-100 text-slate-600'
                      }`}>
                      <i className={`pi ${perm.icon} text-sm`}></i>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{perm.label}</p>
                      <p className="text-xs text-slate-500">{perm.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <i className="pi pi-info-circle text-slate-400 text-3xl mb-2 block"></i>
                  <p className="text-slate-500 text-sm">No specific permissions assigned</p>
                  <p className="text-slate-400 text-xs mt-1">Contact your admin for access</p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Total Permissions</span>
                  <span className="font-semibold text-red-600">{userPermissions.length} / {permissionList.length}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                  <div className="bg-gradient-to-r from-red-600 to-red-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${(userPermissions.length / permissionList.length) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Info */}
          <div className="bg-gradient-to-br from-slate-50 to-red-50 rounded-2xl shadow-lg border border-slate-200/50 p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
              <i className="pi pi-info-circle mr-2 text-red-500"></i>Quick Information
            </h3>
            <div className="space-y-3">
              <InfoRow label="Co-Worker ID" value={user?.id?.slice(-8) || 'N/A'} icon="pi-id-card" />
              <InfoRow label="Username" value={`@${user?.username}`} icon="pi-user" />
              <InfoRow label="Email" value={user?.email} icon="pi-envelope" />
              <InfoRow label="Phone" value={user?.phoneNumber || 'Not provided'} icon="pi-phone" />
              <InfoRow label="Joined" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recently'} icon="pi-calendar" />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          {quickActions.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-slate-800 flex items-center">
                  <i className="pi pi-bolt text-red-600 mr-2"></i>Quick Actions
                </h3>
                <i className="pi pi-arrow-right text-slate-400 text-sm"></i>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {quickActions.map((action) => (
                  <button key={action.path} onClick={() => navigate(action.path)}
                    className={`group relative overflow-hidden p-4 rounded-xl border transition-all duration-300 hover:shadow-lg ${action.color === 'red' ? 'bg-red-50 border-red-200 hover:border-red-300' :
                      action.color === 'amber' ? 'bg-amber-50 border-amber-200 hover:border-amber-300' :
                        action.color === 'green' ? 'bg-green-50 border-green-200 hover:border-green-300' :
                          'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}>
                    <div className="relative z-10">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 ${action.color === 'red' ? 'bg-red-600 text-white' :
                        action.color === 'amber' ? 'bg-amber-600 text-white' :
                          action.color === 'green' ? 'bg-green-600 text-white' :
                            'bg-slate-700 text-white'
                        }`}>
                        <i className={`pi ${action.icon} text-lg`}></i>
                      </div>
                      <p className="font-medium text-slate-800 text-sm">{action.label}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Assigned Organizations with Detailed Permissions */}
          {stats.assignedOrgs.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4">
                <h3 className="font-semibold text-white flex items-center">
                  <i className="pi pi-building mr-2"></i>Your Organizations & Permissions
                </h3>
                <p className="text-slate-300 text-sm mt-1">What you can do in each organization</p>
              </div>
              <div className="divide-y divide-slate-100">
                {stats.assignedOrgs.map((org, i) => {
                  const orgPerms = [];
                  if (org.canManageStudents) orgPerms.push('canManageStudents');
                  if (org.canGenerateCards) orgPerms.push('canGenerateCards');
                  if (org.canManageTemplates) orgPerms.push('canManageTemplates');
                  if (org.canUploadCSV) orgPerms.push('canUploadCSV');
                  if (org.canUploadPhotos) orgPerms.push('canUploadPhotos');
                  if (org.canViewAnalytics) orgPerms.push('canViewAnalytics');
                  if (org.canViewAuditLogs) orgPerms.push('canViewAuditLogs');

                  const orgStat = orgStats[org.organizationId];

                  return (
                    <div key={i} className="p-5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between flex-wrap gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                              <span className="text-sm">
                                {org.type === 'corporate' ? '🏢' : org.type === 'university' ? '🎓' : '🏫'}
                              </span>
                            </div>
                            <h4 className="font-semibold text-slate-800 text-lg">{org.organizationName}</h4>
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">
                              {org.type || 'organization'}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-3 mb-3">
                            <div className="flex items-center gap-1 text-sm text-slate-600">
                              <i className="pi pi-users text-xs"></i>
                              <span>{orgStat?.totalPeople || org.totalPeople || 0} people</span>
                            </div>
                            {orgStat && (
                              <>
                                <div className="flex items-center gap-1 text-sm text-slate-600">
                                  <i className="pi pi-camera text-xs"></i>
                                  <span>{orgStat.studentsWithPhotos + orgStat.employeesWithPhotos || 0} with photos</span>
                                </div>
                                <div className="flex items-center gap-1 text-sm text-slate-600">
                                  <i className="pi pi-qrcode text-xs"></i>
                                  <span>{orgStat.cardGenerated || 0} cards ready</span>
                                </div>
                              </>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {orgPerms.map(permKey => (
                              <span key={permKey} className={`text-xs px-2 py-1 rounded-full ${getBadgeColor(permKey)}`}>
                                <i className={`pi ${permissionList.find(p => p.key === permKey)?.icon || 'pi-tag'} mr-1 text-xs`}></i>
                                {getPermissionLabel(permKey)}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {org.canGenerateCards && (
                            <button
                              onClick={() => navigate('/co-worker/cards', { state: { organizationId: org.organizationId } })}
                              className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-1"
                            >
                              <i className="pi pi-qrcode text-xs"></i>
                              <span>Generate Cards</span>
                            </button>
                          )}
                          {org.canManageStudents && (
                            <button
                              onClick={() => navigate('/co-worker/students', { state: { organizationId: org.organizationId } })}
                              className="px-3 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-1"
                            >
                              <i className="pi pi-users text-xs"></i>
                              <span>Manage</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-800 flex items-center">
                <i className="pi pi-history text-red-600 mr-2"></i>Recent Activity
              </h3>
              <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">Live</span>
            </div>
            <div className="space-y-3">
              {stats.recentActivity.length > 0 ? (
                stats.recentActivity.map((item, i) => (
                  <div key={i} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl hover:bg-white transition-all">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color === 'red' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                      <i className={`pi ${item.icon} text-sm`}></i>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{item.action}</p>
                      <p className="text-xs text-slate-500">{item.time}</p>
                    </div>
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <i className="pi pi-info-circle text-slate-300 text-3xl mb-2 block"></i>
                  <p className="text-slate-500 text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </div>

          {/* Help */}
          <div className="bg-gradient-to-br from-slate-50 to-red-50 rounded-2xl shadow-lg border border-slate-200/50 p-5">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <i className="pi pi-question-circle text-white text-xl"></i>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800">Need Help?</h3>
                <p className="text-slate-600 text-sm mt-1">
                  Contact your company administrator for assistance with permissions or access issues.
                </p>
                <div className="mt-3 flex items-center space-x-3">
                  <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                    <i className="pi pi-envelope mr-1"></i>{user?.companyId?.email || 'admin@cardagent.rw'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat Card
const StatCard = ({ title, value, icon, color, subtitle }) => (
  <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-5 group hover:shadow-xl transition-all duration-300">
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300 ${color === 'red' ? 'bg-gradient-to-br from-red-600 to-red-500' : 'bg-gradient-to-br from-slate-700 to-slate-800'}`}>
        <i className={`pi ${icon} text-white text-base`}></i>
      </div>
      <i className="pi pi-ellipsis-h text-slate-400 text-sm"></i>
    </div>
    <p className="text-slate-600 text-sm font-medium">{title}</p>
    <p className="text-xl font-bold text-slate-900 mt-1 truncate">{value}</p>
    {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
  </div>
);

// Info Row
const InfoRow = ({ label, value, icon }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
    <div className="flex items-center space-x-2">
      <i className={`pi ${icon} text-red-500 text-sm w-5`}></i>
      <span className="text-sm text-slate-600">{label}</span>
    </div>
    <span className="text-sm font-medium text-slate-800 truncate ml-4">{value}</span>
  </div>
);

export default CoWorkerOverview;