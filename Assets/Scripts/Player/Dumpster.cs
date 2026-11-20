using UnityEngine;

public class Dumpster : MonoBehaviour
{
    public float range = 1.5f;

    void Update()
    {
        var p = PlayerController.I;
        if (p == null || GameState.I.inCutscene) return;
        if (!GameState.I.CanHideInDumpsters) return;
        if (!Input.GetKeyDown(KeyCode.E)) return;

        if (p.isHiding) { p.isHiding = false; return; }
        if (Vector3.Distance(p.transform.position, transform.position) <= range)
        {
            p.isHiding = true;
            p.isDetected = false;
        }
    }
}
