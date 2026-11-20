import { useInstallOffer } from "./pwa";

// Shown on the start screen of the web version when the tuner can be
// installed and isn't yet. Nothing shows in the native apps.
export default function InstallCard() {
  const offer = useInstallOffer();
  if (offer.kind === "none") return null;

  return (
    <div className='install'>
      <button type='button' className='install-close' onClick={offer.dismiss} aria-label='Not now'>
        ×
      </button>
      <strong>Install Guitar Tuner</strong>
      {offer.kind === "prompt" ? (
        <>
          <p>Put it on your home screen. It opens full screen and works offline.</p>
          <button type='button' className='secondary' onClick={offer.install}>
            Install
          </button>
        </>
      ) : (
        <p>
          Tap <b>Share</b> in the browser bar, then <b>Add to Home Screen</b>. It opens full screen and works offline.
        </p>
      )}
    </div>
  );
}
