using UnityEngine;

public class Vendor : MonoBehaviour
{
    public MeleeWeapon[] stock;
    public float interactRange = 2f;

    // Keys 1-4 while near the vendor.
    void Update()
    {
        var p = PlayerController.I;
        if (p == null || GameState.I.inCutscene) return;
        if (Vector3.Distance(p.transform.position, transform.position) > interactRange) return;

        for (int i = 0; i < stock.Length && i < 4; i++)
            if (Input.GetKeyDown(KeyCode.Alpha1 + i)) Buy(stock[i]);
    }

    void Buy(MeleeWeapon w)
    {
        int price = Mathf.RoundToInt(w.basePrice * GameState.I.WeaponPriceMultiplier);
        if (GameState.I.Spend(price)) PlayerController.I.weapon = w;
    }
}
