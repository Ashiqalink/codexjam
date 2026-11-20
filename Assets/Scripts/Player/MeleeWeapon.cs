using UnityEngine;

[CreateAssetMenu(menuName = "CoupDEtat/Melee Weapon")]
public class MeleeWeapon : ScriptableObject
{
    public string displayName = "Bare Fists";
    public int basePrice = 0;
    public int stunSeconds = 0; // extra stun on non-takedown hits; flavor stat for the jam
}
// Create assets: Rubber Chicken (20), Stale Baguette (35), Folding Chair (60), Golden Briefcase (120).
