using System;
using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;

public enum CaptionStyle { Comedy, Serious }

[Serializable]
public class Shot
{
    public Transform focus;                  // what the camera frames
    public Vector3 focusOffset;
    public float orthoSize = 4f;             // smaller = closer
    public float duration = 2f;              // keep shots to 1.5 to 3 seconds
    public bool cutIn = true;                // true = hard cut, false = glide from previous framing
    public bool drift = true;                // slow push toward the focus point
    [TextArea] public string caption;
    public CaptionStyle style = CaptionStyle.Comedy;
}

[Serializable]
public class CinematicSequence
{
    public string name;
    public List<Shot> shots = new List<Shot>();
    public UnityEngine.Events.UnityEvent onComplete;
}

/// <summary>
/// Plays short shot lists over the live iso camera. Gameplay is frozen via GameState.inCutscene
/// (no Time.timeScale changes). Any key press skips the current sequence after 0.4s.
/// </summary>
public class CinematicDirector : MonoBehaviour
{
    public static CinematicDirector I { get; private set; }

    [Header("UI")]
    public RectTransform topBar;
    public RectTransform bottomBar;
    public TMP_Text captionText;
    public float barHeight = 90f;
    public Color comedyColor = new Color(1f, 0.9f, 0.2f);
    public Color seriousColor = new Color(0.85f, 0.85f, 0.85f);

    Coroutine running;
    bool skip;

    void Awake()
    {
        I = this;
        SetBars(0);
        if (captionText) captionText.text = "";
    }

    public bool IsPlaying => running != null;

    public void Play(CinematicSequence seq)
    {
        if (running != null || seq == null || seq.shots.Count == 0) return;
        running = StartCoroutine(Run(seq));
    }

    IEnumerator Run(CinematicSequence seq)
    {
        var rig = CameraRig.I;
        GameState.I.inCutscene = true;
        rig.cinematicControl = true;
        skip = false;

        yield return Bars(0, 1, 0.3f);

        float t0 = Time.time;
        foreach (var shot in seq.shots)
        {
            if (skip) break;
            yield return PlayShot(rig, shot, t0);
        }

        if (captionText) captionText.text = "";
        yield return Bars(1, 0, 0.3f);

        rig.cinematicControl = false;
        GameState.I.inCutscene = false;
        running = null;
        seq.onComplete?.Invoke();
    }

    IEnumerator PlayShot(CameraRig rig, Shot s, float seqStart)
    {
        Vector3 target = (s.focus ? s.focus.position : rig.focus) + s.focusOffset;
        Vector3 startFocus = rig.focus;
        float startSize = rig.orthoSize;

        if (s.cutIn) { rig.focus = target; rig.orthoSize = s.orthoSize; startFocus = target; startSize = s.orthoSize; }

        if (captionText)
        {
            captionText.text = s.caption;
            captionText.color = s.style == CaptionStyle.Comedy ? comedyColor : seriousColor;
            captionText.fontStyle = s.style == CaptionStyle.Comedy ? FontStyles.Bold | FontStyles.Italic : FontStyles.Normal;
        }

        float t = 0f;
        float endSize = s.drift ? s.orthoSize * 0.92f : s.orthoSize;
        while (t < s.duration && !skip)
        {
            t += Time.deltaTime;
            float k = Mathf.SmoothStep(0, 1, Mathf.Clamp01(t / s.duration));
            rig.focus = s.cutIn ? target : Vector3.Lerp(startFocus, target, k);
            rig.orthoSize = s.cutIn ? Mathf.Lerp(s.orthoSize, endSize, k) : Mathf.Lerp(startSize, endSize, k);
            if (Input.anyKeyDown && Time.time - seqStart > 0.4f) skip = true;
            yield return null;
        }
    }

    IEnumerator Bars(float from, float to, float dur)
    {
        for (float t = 0; t < dur; t += Time.deltaTime) { SetBars(Mathf.Lerp(from, to, t / dur)); yield return null; }
        SetBars(to);
    }

    void SetBars(float k)
    {
        if (topBar) topBar.sizeDelta = new Vector2(0, barHeight * k);
        if (bottomBar) bottomBar.sizeDelta = new Vector2(0, barHeight * k);
    }
}
