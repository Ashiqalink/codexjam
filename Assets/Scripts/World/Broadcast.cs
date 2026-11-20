using UnityEngine;

/// <summary>Tier 3 perk. Press B to stun all roaming (non-official) guards.</summary>
public class Broadcast : MonoBehaviour
{
    public float stunSeconds = 6f;
    public float cooldown = 25f;
    float readyAt;

    void Update()
    {
        if (GameState.I.inCutscene || !GameState.I.HasBroadcast) return;
        if (!Input.GetKeyDown(KeyCode.B) || Time.time < readyAt) return;
        readyAt = Time.time + cooldown;
        foreach (var g in Guard.All)
            if (!g.isOfficial && !g.isDown) g.Stun(stunSeconds);
    }
}
