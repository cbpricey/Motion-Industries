"use client";

import { useState } from 'react';
import { CloudDownload, BrainCog, MonitorCheck, Repeat } from 'lucide-react';

export default function About() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const values = [
    {
      icon: <CloudDownload className="w-8 h-8" />,
      title: "Web Scraper",
      description: `Searches for product images on OEM websites, distributor websites, and Bing. Downloads images 
      and automatically discards low quality results.`
    },
    {
      icon: <BrainCog className="w-8 h-8" />,
      title: "Machine Learning Model",
      description: `Trained on thousands of examples. Analyzes file names and calculates image features such as brightness, 
      whitespace, and entropy. Assigns confidence scores to each image to help prioritize human review efforts.`
    },
    {
      icon: <MonitorCheck className="w-8 h-8" />,
      title: "Review UI",
      description: `Accessible by clicking "Catalog Navigator" in the navbar. Supports sorting and filtering images by 
      manufacturer, SKU, confidence score, and date added. Reviewers' approvals and rejections are confirmed by admins.`
    },
    {
      icon: <Repeat className="w-8 h-8" />,
      title: "Feedback Loop",
      description: `Every approval and rejection is recorded and used to continually retrain and refine the ML Model.`
    }
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Industrial Grid Background */}
      <div className="pointer-events-none fixed inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,0,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,0,0.3) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-20">
        {/* Hero Section */}
        <div className="mb-20">
          <div className="border-l-4 border-red-600 pl-8 mb-8">
            <h1 className="text-7xl font-black text-white mb-4 tracking-tight">
              HOW IT WORKS
            </h1>
            <div className="flex items-center gap-4">
              <div className="h-px bg-red-600 w-20"></div>
              <p className="text-lg text-gray-400 uppercase tracking-widest font-bold">
                Behind the Curtain
              </p>
            </div>
          </div>
          <p className="text-xl text-gray-300 max-w-2xl leading-relaxed border-l-2 border-gray-700 pl-8">
            Engineered to support large scale matching of candidate images to SKUs
          </p>
        </div>

        {/* Story Section */}
        <div className="bg-zinc-900 border-2 border-red-900/50 rounded-none p-12 mb-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-red-600/5 blur-3xl"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 bg-red-600 rotate-45"></div>
              <h2 className="text-3xl font-black text-white uppercase tracking-wider">
                Background
              </h2>
            </div>
            <div className="text-gray-300 space-y-4 leading-relaxed font-mono text-sm">
              <p>
                The problem: The <a href='https://www.motion.com/' className="text-red-500 hover:text-red-600">Motion.com</a> website 
                offers millions of different industrial products to businesses across North America. However, out of
                12 million total SKUs, only 1 million currently have at least one product image.
              </p>
              <p>
                Our objective: To design an automated process for sourcing missing product images for millions of SKUs, 
                boosting sales and elevating the customer experience.
              </p>
              <p>
                Requirements: Robust web scraper to find and download potential matches. Machine Learning model to evaluate
                image quality and relevance. Intuitive UI for Motion employees to review scraped images.
              </p>
            </div>
          </div>
        </div>

        {/* Values Grid */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-3 h-3 bg-red-600 rotate-45"></div>
            <h2 className="text-3xl font-black text-white uppercase tracking-wider">
              Core Systems
            </h2>
            <div className="flex-1 h-px bg-red-900"></div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {values.map((value, i) => (
              <div
                key={i}
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
                className="bg-zinc-900 border-2 border-red-900/50 rounded-none p-8 relative overflow-hidden transition-all duration-300 hover:border-red-600 group"
              >
                <div className={`absolute top-0 left-0 w-1 h-full bg-red-600 transition-all duration-300 ${
                  hoveredCard === i ? 'w-full opacity-10' : 'opacity-0'
                }`}></div>
                <div className="relative">
                  <div className={`text-red-600 mb-4 transition-transform duration-300 ${
                    hoveredCard === i ? 'scale-110' : ''
                  }`}>
                    {value.icon}
                  </div>
                  <h3 className="text-xl font-black text-white mb-3 uppercase tracking-wide">
                    {value.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed text-sm">
                    {value.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-red-600 border-4 border-black rounded-none p-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.3) 10px, rgba(0,0,0,0.3) 20px)'
          }}></div>
          <div className="relative">
            <h2 className="text-4xl font-black text-black mb-4 uppercase tracking-wider">
              Learn More
            </h2>
            {/* <p className="text-black/80 mb-8 max-w-2xl font-bold">
              Join the engineers, builders, and creators who demand more from their tools.
            </p> */}
            <div className="flex gap-4">
              <a href='https://github.com/cbpricey/Motion-Industries/blob/main/MotionUI/motion-ui/README.md' target='_blank'>
                <button className="bg-black text-white px-8 py-4 font-black uppercase tracking-wider hover:bg-zinc-900 transition-colors border-2 border-black">
                  Access README
                </button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}