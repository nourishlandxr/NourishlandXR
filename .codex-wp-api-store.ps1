$ErrorActionPreference = 'Stop'
$target = 'Nourishland.WordPress.API'
$username = 'andre'
$securePass = Read-Host 'Enter the working WordPress Application Password for andre (input is masked)' -AsSecureString
$passPtr = [IntPtr]::Zero
$blobPtr = [IntPtr]::Zero
$targetPtr = [IntPtr]::Zero
$userPtr = [IntPtr]::Zero
$plainPass = $null
$encoded = $null
try {
    $passPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass)
    $plainPass = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passPtr)
    $blob = [Text.Encoding]::Unicode.GetBytes($plainPass)
    $blobPtr = [Runtime.InteropServices.Marshal]::AllocCoTaskMem($blob.Length)
    [Runtime.InteropServices.Marshal]::Copy($blob, 0, $blobPtr, $blob.Length)

    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class NLWindowsCredential {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct CREDENTIAL {
    public UInt32 Flags; public UInt32 Type; public IntPtr TargetName; public IntPtr Comment;
    public long LastWritten; public UInt32 CredentialBlobSize; public IntPtr CredentialBlob;
    public UInt32 Persist; public UInt32 AttributeCount; public IntPtr Attributes;
    public IntPtr TargetAlias; public IntPtr UserName;
  }
  [DllImport("Advapi32.dll", EntryPoint = "CredWriteW", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool CredWrite(ref CREDENTIAL credential, UInt32 flags);
}
"@ -ErrorAction SilentlyContinue

    $targetPtr = [Runtime.InteropServices.Marshal]::StringToCoTaskMemUni($target)
    $userPtr = [Runtime.InteropServices.Marshal]::StringToCoTaskMemUni($username)
    $cred = New-Object NLWindowsCredential+CREDENTIAL
    $cred.Type = 1
    $cred.TargetName = $targetPtr
    $cred.UserName = $userPtr
    $cred.CredentialBlobSize = [UInt32]$blob.Length
    $cred.CredentialBlob = $blobPtr
    $cred.Persist = 2
    if (-not [NLWindowsCredential]::CredWrite([ref]$cred, 0)) {
      $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
      throw "Windows Credential Manager save failed (Windows error $code)."
    }

    $basic = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${username}:${plainPass}"))
    $headers = @{ Authorization = "Basic $basic" }
    $result = Invoke-RestMethod -Uri 'https://nourishland.org/wp-json/wp/v2/users/me?context=edit' -Headers $headers -Method Get -TimeoutSec 30
    [pscustomobject]@{ saved = $true; target = $target; connected = $true; id = $result.id; username = $result.slug; name = $result.name; roles = ($result.roles -join ',') } | ConvertTo-Json -Compress
} catch {
    [pscustomobject]@{ saved = $false; target = $target; connected = $false; message = $_.Exception.Message } | ConvertTo-Json -Compress
} finally {
    if ($blobPtr -ne [IntPtr]::Zero) { if ($blob) { [Runtime.InteropServices.Marshal]::Copy((New-Object byte[] $blob.Length), 0, $blobPtr, $blob.Length) }; [Runtime.InteropServices.Marshal]::FreeCoTaskMem($blobPtr) }
    if ($passPtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passPtr) }
    if ($targetPtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::FreeCoTaskMem($targetPtr) }
    if ($userPtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::FreeCoTaskMem($userPtr) }
    Remove-Variable plainPass,basic,headers,securePass,blob -ErrorAction SilentlyContinue
}
