'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Image, Star, Database, Cpu } from 'lucide-react';

export default function Home() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: <Image className="w-12 h-12" />,
      title: "Intelligent Scraping",
      description: "Advanced algorithms extract high-quality product images from any source.",
      metric: "1000+"
    },
    {
      icon: <Star className="w-12 h-12" />,
      title: "Quality Rating System",
      description: "Automated quality assessment ensures only premium images make the cut.",
      metric: "95%+"
    },
    {
      icon: <Database className="w-12 h-12" />,
      title: "SKU Management",
      description: "Seamless organization and cataloging of product images by SKU.",
      metric: "∞"
    }
  ];

  const stats = [
    { value: "4", label: "Team Members" },
    { value: "2025", label: "Capstone Year" },
    { value: "100%", label: "Image Quality" },
    { value: "Auto", label: "Quality Rating" }
  ];

  const team = [
    { name: "Kimberly"},
    { name: "Owen"},
    { name: "Collin"},
    { name: "Conlan"}
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Industrial Grid Background */}
      <div className="fixed inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,0,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,0,0.3) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          transform: `translateY(${scrollY * 0.5}px)`
        }} />
      </div>

      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center px-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-600/5 blur-3xl"></div>
        
        <div className="relative max-w-6xl w-full">
          {/* Status Bar */}
          <div className="mb-8 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-600 animate-pulse"></div>
              <span className="text-red-600 font-mono text-sm uppercase tracking-wider">Sprint 1</span>
            </div>
            <div className="h-px bg-red-900 flex-1"></div>
          </div>

          {/* Main Headline */}
          <div className="mb-8">
            <div className="text-red-600 font-mono uppercase tracking-widest text-sm mb-4">
              Capstone Project 2025
            </div>
            <h1 className="text-7xl md:text-8xl font-black mb-6 tracking-tighter leading-none">
                Motion Industries <br/>
              <span className="text-red-600">Image-to-Product AI</span><br/>
              Matching System
            </h1>
            <div className="flex items-center gap-4 mb-6">
              <div className="h-1 w-20 bg-red-600"></div>
              <p className="text-gray-400 font-mono uppercase tracking-widest text-sm">
                Automated SKU Image Scraping &amp; Rating
              </p>
            </div>
          </div>

          <p className="text-2xl text-gray-300 max-w-3xl mb-12 leading-relaxed border-l-4 border-red-600 pl-6">
            Advanced automated system for extracting high-quality product images 
            from online sources. Each image is intelligently rated and cataloged 
            by SKU for optimal inventory management.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 mb-16">
            {/* Demo Button */}
            <button className="bg-red-600 text-white px-10 py-5 font-black uppercase tracking-wider hover:bg-red-700 transition-colors border-2 border-red-600 flex items-center gap-3 group">
                View Demo
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* GitHub Button */}
            <a
                href="https://github.com/cbpricey/Motion-Industries"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-transparent text-white px-10 py-5 font-black uppercase tracking-wider hover:bg-white/5 transition-colors border-2 border-white flex items-center gap-3"
            >
                <Cpu className="w-5 h-5" />
                GitHub
            </a>
            </div>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="bg-zinc-900/50 border-2 border-red-900/30 p-6 backdrop-blur-sm">
                <div className="text-3xl font-black text-red-600 mb-2">{stat.value}</div>
                <div className="text-gray-400 text-sm uppercase tracking-wide font-bold">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-16">
            <div className="w-4 h-4 bg-red-600 rotate-45"></div>
            <h2 className="text-5xl font-black uppercase tracking-wider">Core Capabilities</h2>
            <div className="h-px bg-red-900 flex-1"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                onMouseEnter={() => setActiveFeature(i)}
                className="bg-zinc-900 border-2 border-red-900/50 p-8 relative overflow-hidden group cursor-pointer transition-all duration-300 hover:border-red-600"
              >
                <div className={`absolute top-0 left-0 w-2 h-full bg-red-600 transition-all duration-300 ${
                  activeFeature === i ? 'w-full opacity-10' : 'opacity-0'
                }`}></div>
                
                <div className="relative">
                  <div className="text-red-600 mb-6 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  
                  <div className="text-4xl font-black text-white mb-4">{feature.metric}</div>
                  
                  <h3 className="text-xl font-black text-white mb-4 uppercase tracking-wide">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="relative py-32 px-6 bg-zinc-950">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-16">
            <div className="w-4 h-4 bg-red-600 rotate-45"></div>
            <h2 className="text-5xl font-black uppercase tracking-wider">Development Team</h2>
            <div className="h-px bg-red-900 flex-1"></div>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {team.map((member, i) => (
              <div
                key={i}
                className="bg-black border-2 border-red-900/50 p-8 relative overflow-hidden group hover:border-red-600 transition-all duration-300"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-red-600 group-hover:w-full group-hover:opacity-10 transition-all duration-300"></div>
                <div className="relative">
                  <div className="w-16 h-16 bg-zinc-900 border-2 border-red-600 mb-6 flex items-center justify-center">
                    <span className="text-2xl font-black text-red-600">{member.name[0]}</span>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-wide">
                    {member.name}
                  </h3>
                  <p className="text-gray-400 text-sm uppercase tracking-wider font-bold">
                    {member.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Process Section */}
      <div className="relative py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-black border-2 border-red-900 p-8 font-mono">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-red-900">
              <div className="w-3 h-3 rounded-full bg-red-600"></div>
              <div className="w-3 h-3 rounded-full bg-red-600/50"></div>
              <div className="w-3 h-3 rounded-full bg-red-600/20"></div>
              <span className="ml-4 text-gray-500 text-sm">system://process</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex">
                <span className="text-red-600 mr-2">1.</span>
                <span className="text-gray-300">Scrape product images from source URLs</span>
              </div>
              <div className="flex">
                <span className="text-red-600 mr-2">2.</span>
                <span className="text-gray-300">Analyze image quality metrics (resolution, clarity, composition)</span>
              </div>
              <div className="flex">
                <span className="text-red-600 mr-2">3.</span>
                <span className="text-gray-300">Generate automated quality rating (0-100)</span>
              </div>
              <div className="flex">
                <span className="text-red-600 mr-2">4.</span>
                <span className="text-gray-300">Catalog images by SKU in database</span>
              </div>
              <div className="flex mt-4">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-gray-400">System operational. Ready for processing.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="relative py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-600 border-4 border-black p-16 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.3) 10px, rgba(0,0,0,0.3) 20px)'
            }}></div>
            
            <div className="relative text-center">
              <h2 className="text-5xl font-black text-black mb-6 uppercase tracking-wider">
                Capstone 2025
              </h2>
              <p className="text-black/80 text-xl mb-10 font-bold max-w-2xl mx-auto">
                Building the future of automated product image management and quality control.
              </p>
              <button className="bg-black text-white px-12 py-6 font-black uppercase tracking-wider hover:bg-zinc-900 transition-colors border-2 border-black text-lg">
                Explore Project
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative border-t-2 border-red-900 py-12 px-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="text-gray-500 font-mono text-sm">© 2025 Capstone Group 2. All systems operational.</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
            <span className="text-gray-500 font-mono text-sm uppercase">Online</span>
          </div>
        </div>
      </div>
    </div>
  );
}
