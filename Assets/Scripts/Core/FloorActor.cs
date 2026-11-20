using System;
using UnityEngine;

/// <summary>Anything that lives on an interior floor. Overworld = floor 0.</summary>
public class FloorActor : MonoBehaviour
{
    public int currentFloor;
    public event Action<int> OnFloorChanged;

    public void SetFloor(int floor, Vector3 worldPos)
    {
        currentFloor = floor;
        var cc = GetComponent<CharacterController>();
        if (cc) cc.enabled = false;          // required before teleporting a CharacterController
        transform.position = worldPos;
        if (cc) cc.enabled = true;
        OnFloorChanged?.Invoke(floor);
    }
}
