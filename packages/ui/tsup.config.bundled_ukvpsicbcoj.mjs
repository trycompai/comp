// tsup.config.ts
import { glob } from "glob";
import { defineConfig } from "tsup";
var components = glob.sync("src/components/**/*.{ts,tsx}");
var hooks = glob.sync("src/hooks/**/*.{ts,tsx}");
var utils = glob.sync("src/utils/**/*.{ts,tsx}");
var tsup_config_default = defineConfig({
  entry: ["src/index.ts", ...components, ...hooks, ...utils],
  format: ["esm"],
  dts: true,
  splitting: false,
  clean: true,
  bundle: false,
  external: ["react", "react-dom"],
  target: "es2022",
  platform: "neutral",
  esbuildOptions(options) {
    options.jsx = "preserve";
    options.platform = "neutral";
    options.packages = "external";
  },
  outDir: "dist",
  onSuccess: async () => {
    const { cp } = await import("fs/promises");
    await cp("src/globals.css", "dist/globals.css");
    await cp("src/editor.css", "dist/editor.css");
  }
});
export {
  tsup_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidHN1cC5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9faW5qZWN0ZWRfZmlsZW5hbWVfXyA9IFwiL1VzZXJzL3RvZmlrL0Rlc2t0b3AvY29tcC9wYWNrYWdlcy91aS90c3VwLmNvbmZpZy50c1wiO2NvbnN0IF9faW5qZWN0ZWRfZGlybmFtZV9fID0gXCIvVXNlcnMvdG9maWsvRGVza3RvcC9jb21wL3BhY2thZ2VzL3VpXCI7Y29uc3QgX19pbmplY3RlZF9pbXBvcnRfbWV0YV91cmxfXyA9IFwiZmlsZTovLy9Vc2Vycy90b2Zpay9EZXNrdG9wL2NvbXAvcGFja2FnZXMvdWkvdHN1cC5jb25maWcudHNcIjtpbXBvcnQgeyBnbG9iIH0gZnJvbSAnZ2xvYic7XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd0c3VwJztcblxuY29uc3QgY29tcG9uZW50cyA9IGdsb2Iuc3luYygnc3JjL2NvbXBvbmVudHMvKiovKi57dHMsdHN4fScpO1xuY29uc3QgaG9va3MgPSBnbG9iLnN5bmMoJ3NyYy9ob29rcy8qKi8qLnt0cyx0c3h9Jyk7XG5jb25zdCB1dGlscyA9IGdsb2Iuc3luYygnc3JjL3V0aWxzLyoqLyoue3RzLHRzeH0nKTtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgZW50cnk6IFsnc3JjL2luZGV4LnRzJywgLi4uY29tcG9uZW50cywgLi4uaG9va3MsIC4uLnV0aWxzXSxcbiAgZm9ybWF0OiBbJ2VzbSddLFxuICBkdHM6IHRydWUsXG4gIHNwbGl0dGluZzogZmFsc2UsXG4gIGNsZWFuOiB0cnVlLFxuICBidW5kbGU6IGZhbHNlLFxuICBleHRlcm5hbDogWydyZWFjdCcsICdyZWFjdC1kb20nXSxcbiAgdGFyZ2V0OiAnZXMyMDIyJyxcbiAgcGxhdGZvcm06ICduZXV0cmFsJyxcbiAgZXNidWlsZE9wdGlvbnMob3B0aW9ucykge1xuICAgIC8vIFByZXNlcnZlIEpTWCAtIGxldCBOZXh0LmpzIGhhbmRsZSB0aGUgdHJhbnNmb3JtYXRpb25cbiAgICBvcHRpb25zLmpzeCA9ICdwcmVzZXJ2ZSc7XG4gICAgb3B0aW9ucy5wbGF0Zm9ybSA9ICduZXV0cmFsJztcbiAgICBvcHRpb25zLnBhY2thZ2VzID0gJ2V4dGVybmFsJztcbiAgfSxcbiAgb3V0RGlyOiAnZGlzdCcsXG4gIG9uU3VjY2VzczogYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHsgY3AgfSA9IGF3YWl0IGltcG9ydCgnZnMvcHJvbWlzZXMnKTtcbiAgICBhd2FpdCBjcCgnc3JjL2dsb2JhbHMuY3NzJywgJ2Rpc3QvZ2xvYmFscy5jc3MnKTtcbiAgICBhd2FpdCBjcCgnc3JjL2VkaXRvci5jc3MnLCAnZGlzdC9lZGl0b3IuY3NzJyk7XG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNlAsU0FBUyxZQUFZO0FBQ2xSLFNBQVMsb0JBQW9CO0FBRTdCLElBQU0sYUFBYSxLQUFLLEtBQUssOEJBQThCO0FBQzNELElBQU0sUUFBUSxLQUFLLEtBQUsseUJBQXlCO0FBQ2pELElBQU0sUUFBUSxLQUFLLEtBQUsseUJBQXlCO0FBRWpELElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLE9BQU8sQ0FBQyxnQkFBZ0IsR0FBRyxZQUFZLEdBQUcsT0FBTyxHQUFHLEtBQUs7QUFBQSxFQUN6RCxRQUFRLENBQUMsS0FBSztBQUFBLEVBQ2QsS0FBSztBQUFBLEVBQ0wsV0FBVztBQUFBLEVBQ1gsT0FBTztBQUFBLEVBQ1AsUUFBUTtBQUFBLEVBQ1IsVUFBVSxDQUFDLFNBQVMsV0FBVztBQUFBLEVBQy9CLFFBQVE7QUFBQSxFQUNSLFVBQVU7QUFBQSxFQUNWLGVBQWUsU0FBUztBQUV0QixZQUFRLE1BQU07QUFDZCxZQUFRLFdBQVc7QUFDbkIsWUFBUSxXQUFXO0FBQUEsRUFDckI7QUFBQSxFQUNBLFFBQVE7QUFBQSxFQUNSLFdBQVcsWUFBWTtBQUNyQixVQUFNLEVBQUUsR0FBRyxJQUFJLE1BQU0sT0FBTyxhQUFhO0FBQ3pDLFVBQU0sR0FBRyxtQkFBbUIsa0JBQWtCO0FBQzlDLFVBQU0sR0FBRyxrQkFBa0IsaUJBQWlCO0FBQUEsRUFDOUM7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
