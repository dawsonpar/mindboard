import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import os from 'os';

export async function GET() {
  const platform = os.platform();

  try {
    let selectedPath = '';

    if (platform === 'darwin') {
      const result = execSync(
        `osascript -e 'set theFolder to choose folder with prompt "Select your notes directory"' -e 'POSIX path of theFolder'`,
        { encoding: 'utf-8', timeout: 60000 }
      );
      selectedPath = result.trim();
    } else if (platform === 'linux') {
      const result = execSync(
        `zenity --file-selection --directory --title="Select your notes directory" 2>/dev/null || kdialog --getexistingdirectory ~ 2>/dev/null`,
        { encoding: 'utf-8', timeout: 60000 }
      );
      selectedPath = result.trim();
    } else if (platform === 'win32') {
      const psScript = `Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Select your notes directory'; if ($f.ShowDialog() -eq 'OK') { $f.SelectedPath }`;
      const result = execSync(
        `powershell -Command "${psScript}"`,
        { encoding: 'utf-8', timeout: 60000 }
      );
      selectedPath = result.trim();
    } else {
      return NextResponse.json(
        { error: 'Unsupported platform' },
        { status: 400 }
      );
    }

    if (!selectedPath) {
      return NextResponse.json(
        { error: 'No directory selected' },
        { status: 400 }
      );
    }

    // Remove trailing slash if present (except for root "/")
    if (selectedPath.length > 1 && selectedPath.endsWith('/')) {
      selectedPath = selectedPath.slice(0, -1);
    }

    return NextResponse.json({ path: selectedPath });
  } catch {
    return NextResponse.json(
      { error: 'Directory selection was cancelled or failed' },
      { status: 400 }
    );
  }
}
