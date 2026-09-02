import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false, // html5-qrcode no es compatible con el doble mount de Strict Mode
  allowedDevOrigins: ['192.168.8.*', '192.168.1.*', 'localhost:3000', 'localhost:5000', '192.168.1.*:5000', '172.16.36.*'],
};

export default nextConfig;  