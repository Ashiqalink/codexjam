using UnityEngine;

/// <summary>
/// Steal-from-it object (safe, desk, till). Press E nearby. Optionally holds a politician's secret,
/// which is what later lets the player blackmail that official into endorsing him.
/// </summary>
public class Lootable : MonoBehaviour
{
    public FloorActor floor;              // floor this object is on
    public int cash = 50;
    public bool holdsSecret;
    public BuildingId secretOf;
    public float range = 1.6f;
    public bool looted;

    void Update()
    {
        var p = PlayerController.I;
        if (looted || p == null || GameState.I.inCutscene) return;
        if (floor.currentFloor != p.floor.currentFloor) return;
        if (p.isDetected) return;                                            // cannot steal while spotted
        if (!Input.GetKeyDown(KeyCode.E)) return;
        if (Vector3.Distance(p.transform.position, transform.position) > range) return;

        looted = true;
        GameState.I.AddCash(cash);
        if (holdsSecret) GameState.I.FindSecret(secretOf);
        gameObject.SetActive(false);
    }
}
