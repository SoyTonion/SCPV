import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false, // html5-qrcode no es compatible con el doble mount de Strict Mode
  allowedDevOrigins: ['192.168.8.*', 'localhost:3000'],
};

export default nextConfig;