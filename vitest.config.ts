import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 只跑构建产物断言。这一层不需要浏览器，也不需要 jsdom —— 断言打在
    // 导出的文件树与文件内容上。运行时行为归接缝 ②（Playwright，见 #66）。
    include: ["test/**/*.test.ts"],
    environment: "node",
    // 每个测试文件各自索引一次 out/（几百个文件的 stat + 几十个 HTML 的读取，
    // 毫秒级），并行没有意义，串行反而输出更好读。
    fileParallelism: false,
    reporters: ["verbose"],
  },
});
