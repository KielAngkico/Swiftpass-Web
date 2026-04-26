const trackPageVisit = (pageName) => {
  fetch('/api/audit/page-visit', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page: pageName })
  }).catch(() => {})
}

export default trackPageVisit