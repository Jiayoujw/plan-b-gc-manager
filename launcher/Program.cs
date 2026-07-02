using System;
using System.Diagnostics;
using System.IO;
using System.Threading;

class PlanBLauncher
{
    static Process serverProcess;
    static void Main(string[] args)
    {
        string appDir = AppDomain.CurrentDomain.BaseDirectory;
        string serverJs = Path.Combine(appDir, "server.js");
        string nodeExe = FindNode();

        if (nodeExe == null)
        {
            Console.WriteLine("[错误] 未找到 Node.js。请先安装 https://nodejs.org/");
            Console.WriteLine("按任意键退出...");
            Console.ReadKey();
            return;
        }

        Console.WriteLine("========================================");
        Console.WriteLine("  Plan-B 提瓦特管理台 v0.2.0");
        Console.WriteLine("  Grasscutter Private Server Manager");
        Console.WriteLine("========================================");
        Console.WriteLine();

        // Start Node.js server
        Console.WriteLine("[1/3] 启动后端服务...");
        var psi = new ProcessStartInfo
        {
            FileName = nodeExe,
            Arguments = "\"" + serverJs + "\"",
            WorkingDirectory = appDir,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        };

        serverProcess = Process.Start(psi);
        serverProcess.OutputDataReceived += (s, e) => { if (e.Data != null) Console.WriteLine(e.Data); };
        serverProcess.ErrorDataReceived += (s, e) => { if (e.Data != null) Console.Error.WriteLine(e.Data); };
        serverProcess.BeginOutputReadLine();
        serverProcess.BeginErrorReadLine();

        // Wait for server to be ready
        Console.WriteLine("[2/3] 等待服务就绪...");
        for (int i = 0; i < 30; i++)
        {
            try
            {
                var req = System.Net.WebRequest.Create("http://localhost:8080/login.html");
                req.Timeout = 2000;
                using (var resp = req.GetResponse()) { break; }
            }
            catch { Thread.Sleep(1000); }
        }

        // Open browser
        Console.WriteLine("[3/3] 打开管理台...");
        Process.Start("http://localhost:8080");

        Console.WriteLine();
        Console.WriteLine("========================================");
        Console.WriteLine("  管理台: http://localhost:8080");
        Console.WriteLine("  默认账号: admin / admin123");
        Console.WriteLine("  关闭此窗口将停止服务");
        Console.WriteLine("========================================");

        // Auto-start GC+Mongo after a delay
        Thread.Sleep(3000);
        try
        {
            var req = System.Net.WebRequest.Create("http://localhost:8080/api/server/start-all");
            req.Method = "POST";
            req.Timeout = 5000;
            req.GetResponse();
            Console.WriteLine("[自动] 已发送 MongoDB + Grasscutter 启动指令");
        }
        catch { }

        // Wait for user to close
        Console.WriteLine("按 Ctrl+C 或关闭此窗口停止服务...");
        Console.CancelKeyPress += (s, e) =>
        {
            e.Cancel = true;
            Shutdown();
        };

        serverProcess.WaitForExit();
        Console.WriteLine("服务已停止。");
    }

    static string FindNode()
    {
        // Check common locations
        string[] paths = {
            @"C:\Program Files\nodejs\node.exe",
            @"C:\Program Files (x86)\nodejs\node.exe",
        };

        foreach (var p in paths)
            if (File.Exists(p)) return p;

        // Check PATH
        try
        {
            var proc = Process.Start(new ProcessStartInfo
            {
                FileName = "where",
                Arguments = "node",
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
            });
            var output = proc.StandardOutput.ReadToEnd();
            proc.WaitForExit();
            if (proc.ExitCode == 0)
            {
                var lines = output.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
                if (lines.Length > 0) return lines[0].Trim();
            }
        }
        catch { }

        return null;
    }

    static void Shutdown()
    {
        Console.WriteLine("正在停止服务...");
        try
        {
            var req = System.Net.WebRequest.Create("http://localhost:8080/api/server/stop-all");
            req.Method = "POST";
            req.Timeout = 5000;
            req.GetResponse();
        }
        catch { }
        if (serverProcess != null && !serverProcess.HasExited)
        {
            serverProcess.Kill();
        }
        Environment.Exit(0);
    }
}
