// export default function About () {
//     return <h1>Motions Statistics page</h1>
// }

"use client";

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// Simple SVG Icons
const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ImageIcon = () => (
  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const AlertIconLarge = () => (
  <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const ScraperStatsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch products from your API
      const res = await fetch('/api/products');
      
      if (!res.ok) {
        throw new Error(`API error: ${res.statusText}`);
      }
      
      const products = await res.json();
      
      // Process the data to generate statistics
      const processedStats = processProducts(products);
      setStats(processedStats);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching stats:', err);
    
    } finally {
      setLoading(false);
    }
  };

  const processProducts = (products) => {
    // Count by manufacturer
    const manufacturerCounts = {};
    products.forEach(p => {
      manufacturerCounts[p.manufacturer] = (manufacturerCounts[p.manufacturer] || 0) + 1;
    });
    
    const byManufacturer = Object.entries(manufacturerCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Categorize by confidence score
    const confidenceRanges = {
      'High (0.8-1.0)': 0,
      'Medium (0.6-0.8)': 0,
      'Low (0.4-0.6)': 0,
      'Very Low (<0.4)': 0
    };
    
    products.forEach(p => {
      const score = p.confidence_score;
      if (score >= 0.8) confidenceRanges['High (0.8-1.0)']++;
      else if (score >= 0.6) confidenceRanges['Medium (0.6-0.8)']++;
      else if (score >= 0.4) confidenceRanges['Low (0.4-0.6)']++;
      else confidenceRanges['Very Low (<0.4)']++;
    });
    
    const byConfidence = Object.entries(confidenceRanges)
      .map(([name, count]) => ({ name, count }))
      .filter(item => item.count > 0);

    // Count unique SKUs
    const uniqueSkus = new Set(products.map(p => p.sku)).size;

    // Calculate average confidence score
    const avgConfidence = products.length > 0
      ? (products.reduce((sum, p) => sum + p.confidence_score, 0) / products.length).toFixed(2)
      : 0;

    // Generate mock timeline data (since we don't have timestamps)
    const byDate = generateMockDates(products.length);

    return {
      totalPending: products.length,
      uniqueSkus,
      avgConfidence,
      byManufacturer,
      byDate,
      byConfidence,
      avgPerDay: Math.round(products.length / 7)
    };
  };

  const generateMockDates = (total) => {
    // Generate last 7 days of mock data
    const dates = [];
    const today = new Date();
    const avg = Math.floor(total / 7);
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push({
        date: date.toISOString().split('T')[0],
        count: Math.floor(avg + Math.random() * avg * 0.4 - avg * 0.2)
      });
    }
    
    return dates;
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4">
            <svg className="animate-spin text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <p className="text-gray-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <AlertIconLarge />
          <h2 className="text-xl font-semibold text-red-900 mb-2">Error Loading Data</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={fetchStats}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            Retry
          </button>
          <p className="text-sm text-gray-600 mt-4">
            Using mock data for demonstration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Motion Industries Review Statistics
              </h1>
              <p className="text-gray-600">Images pending approval</p>
            </div>
            <button
              onClick={fetchStats}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <RefreshIcon />
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <ClockIcon />
            </div>
            <p className="text-gray-600 text-sm mb-1">Total SKUs</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalPending}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <ImageIcon />
            </div>
            <p className="text-gray-600 text-sm mb-1">Unique SKUs</p>
            <p className="text-3xl font-bold text-gray-900">{stats.uniqueSkus}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckIcon />
            </div>
            <p className="text-gray-600 text-sm mb-1">Avg Confidence</p>
            <p className="text-3xl font-bold text-gray-900">{stats.avgConfidence}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertIcon />
            </div>
            <p className="text-gray-600 text-sm mb-1">Manufacturers</p>
            <p className="text-3xl font-bold text-gray-900">{stats.byManufacturer.length}</p>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Images by Manufacturer */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Images by Manufacturer</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.byManufacturer}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Confidence Score Distribution */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Confidence Score Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.byConfidence}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {stats.byConfidence.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Timeline Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Scraping Timeline</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.byDate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#3b82f6" 
                strokeWidth={2} 
                name="Images Scraped"
                dot={{ fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Manufacturers List */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Manufacturers</h2>
          <div className="space-y-3">
            {stats.byManufacturer.map((manufacturer, index) => (
              <div key={manufacturer.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 font-semibold w-6">#{index + 1}</span>
                  <span className="text-gray-900">{manufacturer.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-48 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(manufacturer.count / stats.totalPending) * 100}%` }}
                    />
                  </div>
                  <span className="text-gray-600 font-semibold w-16 text-right">
                    {manufacturer.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScraperStatsPage;