/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",

  // ⚠️ 不要改回 true —— 见 docs/adr/0003-trailing-slash-false.md
  //
  // Next 官方文档倾向对静态托管使用 trailingSlash: true，所以这行看起来「配错了」。
  // 但 sitemap 里已收录的 26 条地址是**无扩展名无尾斜杠**的形式（/about、/pricing …）。
  // 设为 false 时 Next 直接导出 out/about.html，Cloudflare Pages 对无扩展名请求
  // 自动解析过去，URL 与已收录地址逐字一致，零重定向、零权重损失。
  // 改成 true 会让那 26 条全部变成需要跳转的地址。
  trailingSlash: false,
  images: { unoptimized: true },
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
