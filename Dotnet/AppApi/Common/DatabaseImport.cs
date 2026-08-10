using System;
using System.IO;

namespace VRCX
{
    public partial class AppApi
    {
        private static readonly byte[] SqliteHeader =
        {
            0x53, 0x51, 0x4C, 0x69, 0x74, 0x65, 0x20, 0x66,
            0x6F, 0x72, 0x6D, 0x61, 0x74, 0x20, 0x33, 0x00
        };

        public bool ImportDatabase(string sourcePath)
        {
            if (string.IsNullOrEmpty(sourcePath) || !File.Exists(sourcePath))
                return false;

            if (!IsSqliteDatabase(sourcePath))
                return false;

            var destination = Program.ConfigLocation;
            var configuredLocation = VRCXStorage.Instance.Get("VRCX_DatabaseLocation");
            if (!string.IsNullOrEmpty(configuredLocation))
                destination = configuredLocation;

            if (string.Equals(Path.GetFullPath(sourcePath), Path.GetFullPath(destination),
                    StringComparison.OrdinalIgnoreCase))
                return false;

            try
            {
                SQLite.Instance.Exit();

                File.Copy(sourcePath, destination, true);

                foreach (var suffix in new[] { "-wal", "-shm" })
                {
                    var journal = $"{destination}{suffix}";
                    if (File.Exists(journal))
                        File.Delete(journal);
                }
            }
            catch (Exception ex)
            {
                logger.Error(ex, "Failed to import database from {sourcePath}", sourcePath);
                SQLite.Instance.Init();
                return false;
            }

            RestartApplication(false);
            return true;
        }

        private static bool IsSqliteDatabase(string path)
        {
            try
            {
                using var stream = File.OpenRead(path);
                var header = new byte[SqliteHeader.Length];
                if (stream.Read(header, 0, header.Length) != header.Length)
                    return false;

                for (var i = 0; i < header.Length; i++)
                {
                    if (header[i] != SqliteHeader[i])
                        return false;
                }

                return true;
            }
            catch (Exception ex)
            {
                logger.Error(ex, "Failed to read database header from {path}", path);
                return false;
            }
        }
    }
}
