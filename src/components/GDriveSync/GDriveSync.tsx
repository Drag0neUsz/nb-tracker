import { useLanguage } from '../../i18n/LanguageContext'
import { useSync } from '../../store/SyncContext'
import './GDriveSync.css'

function formatSyncedAt(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleString(locale === 'pl' ? 'pl-PL' : 'en-GB', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function GDriveSync() {
  const { t, locale } = useLanguage()
  const { configured, status, profile, lastSyncedAt, error, signIn, signOut, syncNow } =
    useSync()

  const busy = status === 'signing-in' || status === 'syncing'

  if (!configured) {
    return (
      <section className="panel-section gdrive-sync">
        <h3>{t('gdriveSync')}</h3>
        <p className="hint">{t('gdriveNotConfigured')}</p>
      </section>
    )
  }

  return (
    <section className="panel-section gdrive-sync">
      <h3>{t('gdriveSync')}</h3>
      <p className="hint">{t('gdriveHint')}</p>

      {profile ? (
        <div className="gdrive-user">
          {profile.picture ? (
            <img
              className="gdrive-avatar"
              src={profile.picture}
              alt=""
              width={28}
              height={28}
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="gdrive-avatar placeholder" aria-hidden="true">
              {profile.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="gdrive-user-meta">
            <span className="gdrive-user-name">{profile.name}</span>
            <span className="gdrive-user-email">{profile.email}</span>
          </div>
        </div>
      ) : null}

      <div className="gdrive-actions">
        {profile ? (
          <>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => void syncNow()}
            >
              {busy ? t('gdriveSyncing') : t('gdriveSyncNow')}
            </button>
            <button
              type="button"
              className="btn ghost"
              disabled={busy}
              onClick={() => void signOut()}
            >
              {t('gdriveSignOut')}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn gdrive-signin"
            disabled={busy}
            onClick={() => void signIn()}
          >
            {status === 'signing-in' ? t('gdriveSigningIn') : t('gdriveSignIn')}
          </button>
        )}
      </div>

      {status === 'synced' && lastSyncedAt && (
        <p className="hint ok">
          {t('gdriveSyncedAt', { time: formatSyncedAt(lastSyncedAt, locale) })}
        </p>
      )}
      {status === 'syncing' && <p className="hint">{t('gdriveSyncing')}</p>}
      {status === 'error' && (
        <p className="hint err">{error ? t('gdriveError', { message: error }) : t('gdriveErrorGeneric')}</p>
      )}
    </section>
  )
}
