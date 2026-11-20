using UnityEngine;

/// <summary>Deterministic stair: entering the trigger sets the player's floor and teleports to a paired landing.</summary>
[RequireComponent(typeof(Collider))]
public class StairTrigger : MonoBehaviour
{
    public Building building;
    public int targetFloor;
    public Transform landing;
    public float cooldown = 0.5f;
    static float lastUse;

    void Reset() { GetComponent<Collider>().isTrigger = true; }

    void OnTriggerEnter(Collider other)
    {
        var actor = other.GetComponent<FloorActor>();
        if (actor == null || Time.time - lastUse < cooldown) return;
        lastUse = Time.time;
        actor.SetFloor(targetFloor, landing.position);
        if (other.GetComponent<PlayerController>()) building.SetVisibleFloor(targetFloor);
    }
}
