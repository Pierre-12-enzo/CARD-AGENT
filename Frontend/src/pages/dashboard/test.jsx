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