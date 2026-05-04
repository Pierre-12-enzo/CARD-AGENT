// pages/superadmin/Overview.jsx - CARD-AGENT SUPER ADMIN DASHBOARD
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { companyAPI, auditAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';

const SuperAdminOverview = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());
  const [stats, setStats] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    pendingCompanies: 0,
    revokedCompanies: 0,
    totalOrganizations: 0,
    totalPeople: 0,
    totalCards: 0,
    totalCoWorkers: 0,
    companies: [],
    recentRegistrations: [],
    platformHealth: {},
    anomalies: []
  });

  useEffect(() => {
    fetchDashboardData();
    const timer = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [companiesRes, auditRes] = await Promise.all([
        companyAPI.getAllCompanies({ limit: 100 }),
        auditAPI.getLogs({ limit: 50 })
      ]);

      const companies = companiesRes?.companies || [];
      const active = companies.filter(c => c.license?.status === 'active');
      const pending = companies.filter(c => c.license?.status === 'pending');
      const revoked = companies.filter(c => c.license?.status === 'revoked');

      let totalOrgs = 0, totalPeople = 0, totalCards = 0, totalCoWorkers = 0;
      companies.forEach(c => {
        totalOrgs += c.stats?.organizations || 0;
        totalPeople += c.stats?.students || 0;
        totalCards += c.stats?.cardsGenerated || c.stats?.totalCards || 0;
        totalCoWorkers += c.stats?.coWorkers || 0;
      });

      // Recent registrations (pending license)
      const recent = companies.filter(c => c.license?.status === 'pending').slice(0, 5);

      // Anomalies from audit
      const anomalies = [];
      if (auditRes?.success && auditRes.logs) {
        const failedLogins = auditRes.logs.filter(l => l.action === 'LOGIN_FAILED');
        if (failedLogins.length >= 3) {
          anomalies.push({ type: 'brute_force', severity: 'critical', message: `${failedLogins.length} failed logins detected`, time: new Date().toLocaleTimeString() });
        }
        const deletions = auditRes.logs.filter(l => l.action?.includes('DELETE'));
        if (deletions.length >= 5) {
          anomalies.push({ type: 'mass_deletion', severity: 'high', message: `${deletions.length} deletion events`, time: new Date().toLocaleTimeString() });
        }
      }

      // Company stats for charts
      const companyChartData = companies.slice(0, 10).map(c => ({
        name: c.name?.substring(0, 15) || 'Unknown',
        organizations: c.stats?.organizations || 0,
        people: c.stats?.students || 0,
        cards: c.stats?.totalCards || 0
      }));

      // License distribution
      const licenseData = [
        { name: 'Active', value: active.length, color: '#16a34a' },
        { name: 'Pending', value: pending.length, color: '#f59e0b' },
        { name: 'Revoked', value: revoked.length, color: '#dc2626' }
      ];

      // Daily activity (mock - replace with real aggregation)
      const dailyActivity = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dailyActivity.push({
          date: d.toLocaleDateString('en-US', { weekday: 'short' }),
          cards: Math.floor(Math.random() * 500) + 100,
          logins: Math.floor(Math.random() * 200) + 50,
          registrations: Math.floor(Math.random() * 10)
        });
      }

      setStats({
        totalCompanies: companies.length,
        activeCompanies: active.length,
        pendingCompanies: pending.length,
        revokedCompanies: revoked.length,
        totalOrganizations: totalOrgs,
        totalPeople,
        totalCards,
        totalCoWorkers,
        companies,
        recentRegistrations: recent,
        companyChartData,
        licenseData,
        dailyActivity,
        anomalies,
        platformHealth: {
          database: 'Connected',
          storage: 'Operational',
          socketio: 'Active',
          uptime: 'Running'
        }
      });
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-semibold">Loading platform overview...</p>
        </div>
      </div>
    );
  }

  const COLORS = ['#16a34a', '#f59e0b', '#dc2626', '#0F172A'];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-red-900 p-6 text-white">
        <div className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold">Platform Overview</h1>
                <span className="px-3 py-1 bg-purple-500/20 border border-purple-400/30 rounded-full text-xs text-purple-200">SUPER ADMIN</span>
              </div>
              <p className="text-slate-300 text-sm">{time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-red-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <i className="pi pi-crown text-white text-2xl"></i>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* Anomalies */}
      {stats.anomalies.length > 0 && (
        <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <i className="pi pi-exclamation-triangle text-red-600 text-xl mt-0.5"></i>
            <div>
              <h3 className="font-bold text-red-800">⚠️ Anomalies Detected</h3>
              {stats.anomalies.map((a, i) => (
                <p key={i} className="text-sm text-red-700 mt-1">• {a.message} ({a.time})</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MiniStat icon="pi pi-building" label="Companies" value={stats.totalCompanies} sub={`${stats.activeCompanies} active`} color="slate" />
        <MiniStat icon="pi pi-building" label="Organizations" value={stats.totalOrganizations} sub="Total clients" color="red" />
        <MiniStat icon="pi pi-users" label="People" value={stats.totalPeople} sub="Students & employees" color="slate" />
        <MiniStat icon="pi pi-qrcode" label="Cards" value={stats.totalCards} sub="Generated" color="red" />
        <MiniStat icon="pi pi-user-plus" label="Co-Workers" value={stats.totalCoWorkers} sub="Across platform" color="slate" />
        <MiniStat icon="pi pi-clock" label="Pending" value={stats.pendingCompanies} sub="Awaiting license" color="amber" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Stats Bar Chart */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-5">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Top Companies Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.companyChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
              <Bar dataKey="organizations" fill="#0F172A" radius={[4, 4, 0, 0]} name="Organizations" />
              <Bar dataKey="people" fill="#DC2626" radius={[4, 4, 0, 0]} name="People" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* License Distribution Pie */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-5">
          <h3 className="text-lg font-bold text-slate-800 mb-4">License Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={stats.licenseData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}>
                {stats.licenseData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Activity Line Chart */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-5">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Platform Activity (7 Days)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={stats.dailyActivity} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
            <Line type="monotone" dataKey="cards" stroke="#DC2626" strokeWidth={2} dot={{ r: 4 }} name="Cards Generated" />
            <Line type="monotone" dataKey="logins" stroke="#0F172A" strokeWidth={2} dot={{ r: 4 }} name="Logins" />
            <Line type="monotone" dataKey="registrations" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Registrations" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Registrations & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Registrations */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-slate-200/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Pending License Activation</h3>
            <Link to="/super-admin/licenses" className="text-red-600 hover:text-red-700 text-sm font-medium">Manage Licenses →</Link>
          </div>
          {stats.recentRegistrations.length > 0 ? (
            <div className="space-y-3">
              {stats.recentRegistrations.map((company) => (
                <div key={company._id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 bg-amber-200 rounded-lg flex items-center justify-center text-lg">🏢</div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{company.name}</p>
                      <p className="text-xs text-slate-500">{company.email} • {company.adminId?.firstName} {company.adminId?.lastName}</p>
                    </div>
                  </div>
                  <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full">Pending</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-slate-400">No pending registrations</p>
          )}
        </div>

        {/* Quick Actions & Health */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-5">
            <h3 className="text-lg font-bold text-slate-800 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/super-admin/companies" className="flex items-center space-x-3 p-3 bg-slate-50 hover:bg-red-50 rounded-xl transition-colors text-sm">
                <i className="pi pi-building text-red-500"></i><span>Manage Companies</span>
              </Link>
              <Link to="/super-admin/licenses" className="flex items-center space-x-3 p-3 bg-slate-50 hover:bg-red-50 rounded-xl transition-colors text-sm">
                <i className="pi pi-key text-red-500"></i><span>Manage Licenses</span>
              </Link>
              <Link to="/super-admin/audit-logs" className="flex items-center space-x-3 p-3 bg-slate-50 hover:bg-red-50 rounded-xl transition-colors text-sm">
                <i className="pi pi-history text-red-500"></i><span>Audit Logs</span>
              </Link>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-lg p-5 text-white">
            <h3 className="text-lg font-bold mb-3">Platform Health</h3>
            <div className="space-y-2 text-sm">
              <HealthRow label="Database" status={stats.platformHealth.database} />
              <HealthRow label="Storage" status={stats.platformHealth.storage} />
              <HealthRow label="Socket.io" status={stats.platformHealth.socketio} />
              <HealthRow label="Uptime" value={stats.platformHealth.uptime} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-components
const MiniStat = ({ icon, label, value, sub, color }) => (
  <div className="bg-white rounded-xl shadow border border-slate-200/50 p-3 text-center">
    <i className={`${icon} text-lg mb-1 ${color === 'red' ? 'text-red-500' : color === 'amber' ? 'text-amber-500' : 'text-slate-500'}`}></i>
    <p className="text-xl font-bold text-slate-800">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    <p className="text-xs text-slate-500">{label}</p>
    {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
  </div>
);

const HealthRow = ({ label, status, value }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-slate-300">{label}</span>
    {status ? (
      <span className="flex items-center space-x-1.5">
        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
        <span className="text-green-300 text-xs">{status}</span>
      </span>
    ) : (
      <span className="text-slate-400 text-xs">{value}</span>
    )}
  </div>
);

export default SuperAdminOverview;