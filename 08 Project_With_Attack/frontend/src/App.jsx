import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const API = 'http://127.0.0.1:5000'

export default function App() {
	// Sensor registration
	const [sensorRegisterId, setSensorRegisterId] = useState('')
	const [sensorRes, setSensorRes] = useState(null)
	const [sensorLoading, setSensorLoading] = useState(false)
	const [sensorStatus, setSensorStatus] = useState(null)
	const [sensorStatusTarget, setSensorStatusTarget] = useState('')
	const [registeredSensors, setRegisteredSensors] = useState([])
	const [selectedSensor, setSelectedSensor] = useState('')

	// User registration
	const [regUsername, setRegUsername] = useState('')
	const [regPassword, setRegPassword] = useState('')
	const [userRes, setUserRes] = useState(null)
	const [userLoading, setUserLoading] = useState(false)
	const [registeredUsers, setRegisteredUsers] = useState([])
	const [selectedUser, setSelectedUser] = useState('')

	// Binding
	const [bindUsername, setBindUsername] = useState('')
	const [bindSensorId, setBindSensorId] = useState('')

	// Bind
	const [bindRes, setBindRes] = useState(null)
	const [bindLoading, setBindLoading] = useState(false)

	// Authentication
	const [authUsername, setAuthUsername] = useState('')
	const [authPassword, setAuthPassword] = useState('')
	const [authSensorId, setAuthSensorId] = useState('')
	const [authRes, setAuthRes] = useState(null)
	const [authLoading, setAuthLoading] = useState(false)

	// Logs
	const [logs, setLogs] = useState([])
	const pollRef = useRef(null)
	const [showDetails, setShowDetails] = useState(true)

	// Helpers
	const decodeSensorLabel = (label) => {
		// Convert sensor:BASE64 to sensor:decoded if possible
		try {
			if (typeof label === 'string' && label.startsWith('sensor:')) {
				const b64 = label.split(':', 2)[1]
				const txt = atob(b64)
				return `sensor:${txt}`
			}
		} catch {}
		return label
	}

	const timeline = useMemo(() => {
		const typeOrder = { M1: 1, M2: 2, M3: 3, M4: 4 }
		// Group by sessionId if present; otherwise single group
		const groups = new Map()
		for (const l of logs) {
			const sid = l.sessionId || 'default'
			if (!groups.has(sid)) groups.set(sid, [])
			groups.get(sid).push(l)
		}
		const out = []
		for (const [sid, arr] of groups.entries()) {
			const ordered = arr
				.map((l, i) => ({ id: l.seq ?? i, ...l }))
				.sort((a, b) => {
					const ao = typeOrder[a.type] ?? 99
					const bo = typeOrder[b.type] ?? 99
					if (ao !== bo) return ao - bo
					if ((a.seq ?? 0) !== (b.seq ?? 0)) return (a.seq ?? 0) - (b.seq ?? 0)
					return (a.ts ?? 0) - (b.ts ?? 0)
				})
			// Insert a small header arrow to delineate sessions
			if (sid !== 'default') {
				out.push({ id: `sess-${sid}`, type: 'SESSION', src: `Session ${sid}`, dst: '', ts: ordered[0]?.ts })
			}
			out.push(...ordered)
		}
		return out
	}, [logs])

	async function call(path, options = {}) {
		const res = await fetch(`${API}${path}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			...options,
		})
		let data = null
		try {
			data = await res.json()
		} catch (err) {
			if (res.ok) throw err
		}
		if (!res.ok) {
			const message = data?.error || data?.message || `Request failed (HTTP ${res.status})`
			const error = new Error(message)
			error.payload = data
			throw error
		}
		return data ?? {}
	}

	async function refreshLogs() {
		try {
			const res = await fetch(`${API}/logs`)
			if (!res.ok) return
			const data = await res.json()
			setLogs(data)
		} catch {}
	}
	// CHECK IF NEEDED #########
	async function refreshSensorStatus(id = sensorStatusTarget) {
		const target = (id || '').trim()
		if (!target) {
			setSensorStatus(null)
			setSensorStatusTarget('')
			return
		}
		setSensorStatusTarget(target)
		try {
			const res = await fetch(`${API}/sensor/status?sensorId=${encodeURIComponent(target)}`)
			if (!res.ok) {
				setSensorStatus(null)
				return
			}
			const data = await res.json()
			setSensorStatus(data)
		} catch {
			setSensorStatus(null)
		}
	}

	async function refreshUsers() {
		try {
			const res = await fetch(`${API}/users`)
			if (!res.ok) return
			const data = await res.json()
			setRegisteredUsers(data.users || [])
		} catch {}
	}

	async function refreshSensors() {
		try {
			const res = await fetch(`${API}/sensors`)
			if (!res.ok) return
			const data = await res.json()
			setRegisteredSensors(data.sensors || [])
		} catch {}
	}

	const handleSelectUser = (name) => {
		setSelectedUser(name)
	}

	const handleSelectSensor = (id) => {
		setSelectedSensor(id)
		refreshSensorStatus(id)
	}

	function startPollingLogs(intervalMs = 500) {
		clearInterval(pollRef.current)
		pollRef.current = setInterval(refreshLogs, intervalMs)
	}

	function stopPollingLogs() {
		clearInterval(pollRef.current)
		pollRef.current = null
	}

	// Actions
	const onRegisterSensor = async () => {
		const trimmedId = sensorRegisterId.trim()
		if (!trimmedId) {
			setSensorRes({ error: 'Sensor ID is required' })
			return
		}
		setSensorLoading(true)
		setSensorRes(null)
		try {
			const res = await call('/sensor/register', { body: JSON.stringify({ sensorId: trimmedId }) })
			setSensorRes(res)
			setSelectedSensor(trimmedId)
			await refreshLogs()
			await refreshSensorStatus(trimmedId)
			await refreshSensors()
			setSensorRegisterId('')
		} catch (e) {
			setSensorRes({ error: e.message })
		} finally {
			setSensorLoading(false)
		}
	}

	const onRegisterUser = async () => {
		const trimmedUser = regUsername.trim()
		const trimmedPass = regPassword.trim()
		if (!trimmedUser || !trimmedPass) {
			setUserRes({ error: 'Username and password are required' })
			return
		}
		setUserLoading(true)
		setUserRes(null)
		try {
			const res = await call('/user/register', { body: JSON.stringify({ username: trimmedUser, password: trimmedPass }) })
			setUserRes(res)
			setSelectedUser(trimmedUser)
			await refreshLogs()
			await refreshUsers()
			setRegUsername('')
			setRegPassword('')
		} catch (e) {
			setUserRes({ error: e.message })
		} finally {
			setUserLoading(false)
		}
	}

	const onBind = async () => {
		const trimmedUser = bindUsername.trim()
		const trimmedSensor = bindSensorId.trim()
		if (!trimmedUser || !trimmedSensor) {
			setBindRes({ error: 'Username and sensor ID are required' })
			return
		}
		setBindLoading(true)
		setBindRes(null)
		try {
			const res = await call('/bind', { body: JSON.stringify({ username: trimmedUser, sensorId: trimmedSensor }) })
			setBindRes(res)
			await refreshLogs()
			await refreshUsers()
		} catch (e) {
			setBindRes({ error: e.message })
		} finally {
			setBindLoading(false)
		}
	}

	const onAuthenticate = async () => {
		const trimmedUser = authUsername.trim()
		const trimmedPass = authPassword.trim()
		const trimmedSensor = authSensorId.trim()
		if (!trimmedUser || !trimmedPass || !trimmedSensor) {
			setAuthRes({ error: 'Username, password, and sensor ID are required' })
			return
		}
		setAuthLoading(true)
		setAuthRes(null)
		try {
			// Clear old logs and start polling to visualize M1–M4
			await call('/logs/clear', { body: JSON.stringify({}) })
			startPollingLogs()
			const res = await call('/authenticate', { body: JSON.stringify({ username: trimmedUser, password: trimmedPass, sensorId: trimmedSensor }) })
			setAuthRes(res)
			await refreshLogs()
			await refreshSensorStatus(trimmedSensor)
			await refreshUsers()
			await refreshSensors()
		} catch (e) {
			setAuthRes({ error: e.message })
		} finally {
			setAuthLoading(false)
			// Give logs a final chance to settle
			setTimeout(() => {
				refreshLogs()
				stopPollingLogs()
			}, 800)
		}
	}

	useEffect(() => {
		refreshLogs()
		refreshSensorStatus()
		refreshUsers()
		refreshSensors()
		return () => stopPollingLogs()
	}, [])

	return (
		<div className="container">
			<div className="header">
				<div className="brand">Gateway Demo</div>
				<div className="toolbar">
					<button onClick={refreshLogs}>Refresh Logs</button>
					<button onClick={() => call('/logs/clear', { body: JSON.stringify({}) }).then(refreshLogs)}>Clear Logs</button>
					<label style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem' }}>
						<input type="checkbox" checked={showDetails} onChange={e => setShowDetails(e.target.checked)} />
						Show details
					</label>
				</div>
			</div>
			<div className="grid">
				<div className="panel">
					<h2>1) Register Sensor</h2>
					<label>
						<span>Sensor ID</span>
						<input value={sensorRegisterId} onChange={e => setSensorRegisterId(e.target.value)} placeholder="sensor-1" />
					</label>
					<button onClick={onRegisterSensor} disabled={sensorLoading}>
						{sensorLoading ? 'Registering…' : 'Register Sensor'}
					</button>
					{sensorRes && (
						<div className="result">
							{sensorRes.error ? (
								<div>❌ {sensorRes.error}</div>
							) : (
								<div>
									✅ Registered. SID: <code>{sensorRes.sid}</code>
								</div>
							)}
						</div>
					)}
					{sensorStatus && (
						<div className="result">
							<div>Tracking sensor: <code>{sensorStatusTarget}</code></div>
							<div>Initial SID: <code>{sensorStatus.initialSid}</code></div>
							<div>Current SID: <code>{sensorStatus.currentSid || '(unset)'}</code></div>
						</div>
					)}
					{!sensorStatus && sensorStatusTarget && (
						<div className="result">No status available for <code>{sensorStatusTarget}</code>.</div>
					)}
				</div>

				<div className="panel">
					<h2>2) Register User</h2>
					<label>
						<span>Username</span>
						<input value={regUsername} onChange={e => setRegUsername(e.target.value)} placeholder="alice" />
					</label>
					<label>
						<span>Password</span>
						<input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="password123" />
					</label>
					<button onClick={onRegisterUser} disabled={userLoading}>
						{userLoading ? 'Registering…' : 'Register User'}
					</button>
					{userRes && (
						<div className="result">
							{userRes.error ? (
								<div>❌ {userRes.error}</div>
							) : (
								<div>
									✅ Registered. DID: <code>{userRes.did}</code>
								</div>
							)}
						</div>
					)}
				</div>

				<div className="panel">
					<h2>3) Bind</h2>
					<label>
						<span>Username</span>
						<input value={bindUsername} onChange={e => setBindUsername(e.target.value)} />
					</label>
					<label>
						<span>Sensor ID</span>
						<input value={bindSensorId} onChange={e => setBindSensorId(e.target.value)} />
					</label>
					<button onClick={onBind} disabled={bindLoading}>
						{bindLoading ? 'Binding…' : 'Bind User ↔ Sensor'}
					</button>
					{bindRes && (
						<div className="result">
							{bindRes.error ? (
								<div>❌ {bindRes.error}</div>
							) : (
								<div>
									✅ Bound. SID: <code>{bindRes.sid}</code>
								</div>
							)}
						</div>
					)}
				</div>

				<div className="panel">
					  <h2>4) Authenticate</h2>
					<label>
						<span>Username</span>
						<input value={authUsername} onChange={e => setAuthUsername(e.target.value)} />
					</label>
					<label>
						<span>Password</span>
						<input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
					</label>
					<label>
						<span>Sensor ID</span>
						<input value={authSensorId} onChange={e => setAuthSensorId(e.target.value)} />
					</label>
					<button onClick={onAuthenticate} disabled={authLoading}>
						{authLoading ? 'Authenticating…' : 'Authenticate'}
					</button>
					{authRes && (
						<div className="result">
							{authRes.error ? (
								<div>❌ {authRes.error}</div>
							) : (
								<div>✅ {authRes.ok ? 'Authentication successful' : 'Authentication finished'}</div>
							)}
						</div>
					)}
				</div>
			</div>

			<div className="panel" style={{ marginTop: '1rem' }}>
				<h2>Registered Entities</h2>
				<p className="muted">Click an entry to load it into the forms above.</p>
				<div className="lists">
					<div>
						<div className="list-header">Users</div>
						{registeredUsers.length ? (
							<div className="list">
								{registeredUsers.map((user) => (
									<button
										type="button"
										key={user.username}
										className={`list-item${selectedUser === user.username ? ' active' : ''}`}
										onClick={() => handleSelectUser(user.username)}
									>
										<div className="list-title">{user.username}</div>
										<div className="list-sub">DID: <span className="mono">{user.did || '—'}</span></div>
										<div className="list-sub">
											Bound SIDs:{' '}
											{user.boundSids?.length ? user.boundSids.map((sid, idx) => (
												<span key={`${user.username}-${sid}-${idx}`} className="mono">{sid}</span>
											)) : 'none'}
										</div>
									</button>
								))}
							</div>
						) : (
							<div className="empty">No users registered yet.</div>
						)}
					</div>
					<div>
						<div className="list-header">Sensors</div>
						{registeredSensors.length ? (
							<div className="list">
								{registeredSensors.map((sensor) => (
									<button
										type="button"
										key={sensor.sensorId}
										className={`list-item${selectedSensor === sensor.sensorId ? ' active' : ''}`}
										onClick={() => handleSelectSensor(sensor.sensorId)}
									>
										<div className="list-title">{sensor.sensorId}</div>
										<div className="list-sub">Initial SID: <span className="mono">{sensor.initialSid || sensor.sid}</span></div>
										<div className="list-sub">Current SID: <span className="mono">{sensor.currentSid || sensor.sid || '—'}</span></div>
										<div className="list-sub">
											Status: {sensor.hasActiveSession ? 'authenticating…' : 'idle'}
										</div>
									</button>
								))}
							</div>
						) : (
							<div className="empty">No sensors registered yet.</div>
						)}
					</div>
				</div>
			</div>

			<div className="panel" style={{ marginTop: '1rem' }}>
				<h2>Message Flow</h2>
				<div className="timeline">
					{timeline.map((e) => {
						if (e.type === 'SESSION') {
							return (
								<div key={e.id} className={`arrow session`}>
									<span className="src">{e.src}</span>
									<span className="arrow-body">●</span>
									<span className="dst">{new Date((e.ts || 0) * 1000).toLocaleTimeString()}</span>
								</div>
							)
						}
						const prettySrc = decodeSensorLabel(e.src)
						const prettyDst = decodeSensorLabel(e.dst)
						return (
							<div key={e.id} className={`arrow ${e.type}`}>
								<span className="src">{prettySrc}</span>
								<span className="arrow-body"><span className={`pill ${e.type}`}>{e.type}</span></span>
								<span className="dst">{prettyDst}</span>
								{showDetails && (
									<div className="details" style={{ gridColumn: '1 / -1' }}>
										{e.details ? (
											<div className="kv">
												{Object.entries(e.details).map(([k, v]) => (
													<div key={k} className="kv-row">
														<div className="k">{k}</div>
														<div className="v"><code>{String(v)}</code></div>
													</div>
												))}
											</div>
										) : (
											<div className="kv"><div className="kv-row"><div className="k">info</div><div className="v">No details</div></div></div>
										)}
									</div>
								)}
							</div>
						)
					})}
				</div>
			</div>
		</div>
	)
}
