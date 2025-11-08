import { SSHHost } from "../types";

/**
 * Parse SSH connection string into SSHHost object
 * Supports formats:
 * - user@host
 * - user@host:port
 * - host
 * - host:port
 */
export function parseSSHString(sshString: string): SSHHost | null {
  if (!sshString || sshString.trim().length === 0) {
    return null;
  }

  const trimmed = sshString.trim();
  let user: string | undefined;
  let host: string;
  let port: number | undefined;

  // Check if it contains @ (user specified)
  if (trimmed.includes("@")) {
    const [userPart, hostPart] = trimmed.split("@", 2);
    user = userPart || undefined;
    
    // Check if host part contains port
    if (hostPart.includes(":")) {
      const [hostName, portStr] = hostPart.split(":", 2);
      host = hostName;
      const parsedPort = parseInt(portStr, 10);
      port = isNaN(parsedPort) ? undefined : parsedPort;
    } else {
      host = hostPart;
    }
  } else {
    // No user specified, check for port
    if (trimmed.includes(":")) {
      const [hostName, portStr] = trimmed.split(":", 2);
      host = hostName;
      const parsedPort = parseInt(portStr, 10);
      port = isNaN(parsedPort) ? undefined : parsedPort;
    } else {
      host = trimmed;
    }
  }

  if (!host || host.length === 0) {
    return null;
  }

  const id = user ? (port ? `${user}@${host}:${port}` : `${user}@${host}`) : (port ? `${host}:${port}` : host);

  return {
    id,
    user,
    host,
    port,
  };
}

/**
 * Format SSHHost to connection string
 */
export function formatSSHString(sshHost: SSHHost): string {
  const userPart = sshHost.user ? `${sshHost.user}@` : "";
  const portPart = sshHost.port ? `:${sshHost.port}` : "";
  return `${userPart}${sshHost.host}${portPart}`;
}

/**
 * Format SSHHost to Cursor remote URI
 */
export function formatCursorRemoteURI(sshHost: SSHHost): string {
  const connectionString = formatSSHString(sshHost);
  return `ssh-remote+${connectionString}`;
}

/**
 * Validate SSH host format
 */
export function isValidSSHHost(sshString: string): boolean {
  return parseSSHString(sshString) !== null;
}

