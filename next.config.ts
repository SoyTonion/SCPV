import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.8.*', 'localhost:3000'],
  
  // tus otras configuraciones si existen...
};

export default nextConfig;