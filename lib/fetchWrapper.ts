const fetchWrapper = async (...args: Parameters<typeof fetch>): Promise<Response | undefined> => {
  try {
    const response = await fetch(...args);

    // if backend sent a redirect
    if (response.redirected) {
      window.location.href = response.url;
      return;
    }

    // Always return 429 so callers can handle rate-limit retry
    if (response.status === 429) {
      return response;
    }

    // For /api/agent calls, always return the response (even 4xx/5xx)
    // so the polling logic in aiAgent.ts can handle retries gracefully
    // without triggering confirm() dialogs that break the flow.
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url ?? ''
    if (url.includes('/api/agent')) {
      return response;
    }

    if (response.status == 404) {
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("text/html")) {
        const html = await response.text();
        document.open();
        document.write(html);
        document.close();
        return;
      } else {
        alert("Backend returned Endpoint Not Found.");
      }
    } else if (response.status >= 500) {
      const shouldRefresh = confirm(
        "Backend is not responding. Click OK to refresh.",
      );

      if (shouldRefresh) {
        window.location.reload();
      }

      return;
    }

    return response;
  } catch (error) {
    // For /api/agent calls, don't show confirm dialog — let caller handle retry
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url ?? ''
    if (url.includes('/api/agent')) {
      throw error; // Re-throw so aiAgent.ts catch block handles it
    }

    const shouldRefresh = confirm(
      "Cannot connect to backend. Click OK to refresh.",
    );

    if (shouldRefresh) {
      window.location.reload();
    }
  }
};

export default fetchWrapper;
