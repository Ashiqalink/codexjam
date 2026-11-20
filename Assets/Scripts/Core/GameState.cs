using System;
using UnityEngine;

public enum BuildingId { DMV, Sanitation, TaxOffice, PropagandaTower, Palace }

/// <summary>Single source of truth. Discrete states only, no physics.</summary>
public class GameState : MonoBehaviour
{
    public static GameState I { get; private set; }

    public int cash;
    public int clout;                 // 0..100
    public bool inCutscene;
    public bool[] hijacked = new bool[5];
    public bool[] secretFound = new bool[5];   // dirt on each politician

    public const int PalaceUnlockClout = 80;
    static readonly int[] CloutReward = { 20, 15, 15, 30, 0 }; // 20+15+15+30 = 80

    public event Action<int> OnCloutChanged;
    public event Action<BuildingId> OnHijacked;
    public event Action OnPalaceUnlocked;
    public event Action<BuildingId> OnSecretFound;

    void Awake() { I = this; }

    public bool Has(BuildingId b) => hijacked[(int)b];
    public bool HasSecret(BuildingId b) => secretFound[(int)b];
    public void FindSecret(BuildingId b) { if (secretFound[(int)b]) return; secretFound[(int)b] = true; OnSecretFound?.Invoke(b); }
    public bool PalaceUnlocked => clout >= PalaceUnlockClout;

    // Perks derive from hijacked buildings, so there is no extra state to desync.
    public float DetectionTimeMultiplier => Has(BuildingId.DMV) ? 2f : 1f;
    public bool CanHideInDumpsters => Has(BuildingId.Sanitation);
    public float WeaponPriceMultiplier => Has(BuildingId.TaxOffice) ? 0.5f : 1f;
    public bool HasBroadcast => Has(BuildingId.PropagandaTower);

    public void Hijack(BuildingId b)
    {
        if (Has(b)) return;
        bool wasUnlocked = PalaceUnlocked;
        hijacked[(int)b] = true;
        clout = Mathf.Min(100, clout + CloutReward[(int)b]);
        OnCloutChanged?.Invoke(clout);
        OnHijacked?.Invoke(b);
        if (!wasUnlocked && PalaceUnlocked) OnPalaceUnlocked?.Invoke();
    }

    public void AddCash(int n) { cash += n; }
    public bool Spend(int n) { if (cash < n) return false; cash -= n; return true; }
}

