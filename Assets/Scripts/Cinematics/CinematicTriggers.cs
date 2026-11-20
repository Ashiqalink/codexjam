using UnityEngine;

/// <summary>
/// Wires story beats to sequences. Fill the shot lists in the Inspector.
/// Beats: intro, each hijack, Palace unlock at 80% clout, and the finale.
/// </summary>
public class CinematicTriggers : MonoBehaviour
{
    [Header("Beats (each 3-5 shots, ~2s per shot)")]
    public CinematicSequence intro;               // beach bum wakes up, jobless, eyes the capital
    public CinematicSequence secretFound;         // generic, 2 shots: the dossier, the smirk
    public CinematicSequence dmvHijack;
    public CinematicSequence sanitationHijack;
    public CinematicSequence taxHijack;
    public CinematicSequence towerHijack;
    public CinematicSequence palaceUnlocked;      // clout hits 80%: the palace gates open
    public CinematicSequence finale;              // election win, then the twist

    void Start()
    {
        var gs = GameState.I;
        gs.OnHijacked += HandleHijack;
        gs.OnSecretFound += _ => Queue(secretFound);
        gs.OnPalaceUnlocked += () => Queue(palaceUnlocked);
        Guard.OnKnockedOut += HandleKnockout;
        Queue(intro);
    }

    void OnDestroy()
    {
        if (GameState.I) GameState.I.OnHijacked -= HandleHijack;
        Guard.OnKnockedOut -= HandleKnockout;
    }

    void HandleHijack(BuildingId id)
    {
        switch (id)
        {
            case BuildingId.DMV: Queue(dmvHijack); break;
            case BuildingId.Sanitation: Queue(sanitationHijack); break;
            case BuildingId.TaxOffice: Queue(taxHijack); break;
            case BuildingId.PropagandaTower: Queue(towerHijack); break;
            case BuildingId.Palace: Queue(finale); break;
        }
    }

    // Knockouts no longer end the game; the Palace blackmail does (see HandleHijack).
    void HandleKnockout(Guard g) { }

    void Queue(CinematicSequence s) { StartCoroutineWhenFree(s); }

    void StartCoroutineWhenFree(CinematicSequence s)
    {
        if (s == null) return;
        StartCoroutine(Wait());
        System.Collections.IEnumerator Wait()
        {
            // Hijack and unlock can fire on the same frame; play one after the other.
            while (CinematicDirector.I.IsPlaying) yield return null;
            CinematicDirector.I.Play(s);
            yield return null;
        }
    }
}
