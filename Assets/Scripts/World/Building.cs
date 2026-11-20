using UnityEngine;

/// <summary>Dollhouse cutaway + hijack logic. Floors above the player and the roof are SetActive(false).</summary>
public class Building : MonoBehaviour
{
    public BuildingId id;
    public int topFloor = 0;              // 0 for DMV, 1 for Tier 2, 2 for Tier 3 and Palace
    public GameObject[] floorRoots;       // index == floor number
    public GameObject roof;
    public GameObject bannerObject;       // enabled once hijacked
    public Transform bannerSpot;          // stand here on top floor and press E
    public Guard official;                // must be knocked out first
    public float bannerRange = 2f;

    bool playerInside;

    void Start()
    {
        if (bannerObject) bannerObject.SetActive(false);
        SetVisibleFloor(-1); // exterior view: everything shown
    }

    void OnTriggerEnter(Collider c) { if (c.GetComponent<PlayerController>()) { playerInside = true; SetVisibleFloor(PlayerController.I.floor.currentFloor); } }
    void OnTriggerExit(Collider c)  { if (c.GetComponent<PlayerController>()) { playerInside = false; SetVisibleFloor(-1); } }

    /// <summary>-1 = exterior (show all, roof on). Otherwise hide the roof and floors above `floor`.</summary>
    public void SetVisibleFloor(int floor)
    {
        bool exterior = floor < 0;
        if (roof) roof.SetActive(exterior);
        for (int i = 0; i < floorRoots.Length; i++)
            if (floorRoots[i]) floorRoots[i].SetActive(exterior || i <= floor);
    }

    void Update()
    {
        var gs = GameState.I;
        var p = PlayerController.I;
        if (gs.inCutscene || gs.Has(id) || !playerInside) return;
        if (id == BuildingId.Palace && !gs.PalaceUnlocked) return;
        if (p.floor.currentFloor != topFloor) return;
        // Blackmail: needs the official's secret. The official can be awake; the threat does the work.
        if (!gs.HasSecret(id)) return;
        if (!Input.GetKeyDown(KeyCode.E)) return;
        if (Vector3.Distance(p.transform.position, bannerSpot.position) > bannerRange) return;

        if (bannerObject) bannerObject.SetActive(true);
        gs.Hijack(id);
    }
}
