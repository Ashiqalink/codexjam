using System;
using System.Collections.Generic;
using UnityEngine;

[RequireComponent(typeof(FloorActor))]
public class Guard : MonoBehaviour
{
    public static readonly List<Guard> All = new List<Guard>();
    public static event Action<Guard> OnKnockedOut;

    [Header("Role")]
    public bool isOfficial;               // top-floor official that must be knocked out to hijack
    public int cashDrop = 15;

    [Header("Detection")]
    public float viewDistance = 7f;
    public float viewAngle = 90f;         // full cone angle
    public float baseDetectTime = 1.5f;

    [Header("Patrol")]
    public Transform[] waypoints;
    public float speed = 2f;

    [HideInInspector] public FloorActor floor;
    public bool isDown;
    float detectTimer;
    float stunTimer;
    int wp;

    void Awake() { floor = GetComponent<FloorActor>(); }
    void OnEnable() { All.Add(this); }
    void OnDisable() { All.Remove(this); }

    void Update()
    {
        if (isDown || GameState.I.inCutscene) return;

        if (stunTimer > 0f) { stunTimer -= Time.deltaTime; return; }

        var p = PlayerController.I;
        // Cross-floor aggro is blocked by this single integer comparison.
        bool sameFloor = floor.currentFloor == p.floor.currentFloor;

        if (sameFloor && TryTakedown(p)) return;
        UpdateDetection(p, sameFloor);
        if (detectTimer <= 0f) Patrol();
    }

    // 2D horizontal vision cone only.
    bool CanSee(PlayerController p)
    {
        if (p.isHiding) return false;
        Vector3 to = p.transform.position - transform.position; to.y = 0;
        if (to.magnitude > viewDistance) return false;
        return Vector3.Angle(transform.forward, to) <= viewAngle * 0.5f;
    }

    void UpdateDetection(PlayerController p, bool sameFloor)
    {
        float need = baseDetectTime * GameState.I.DetectionTimeMultiplier;
        if (sameFloor && CanSee(p)) detectTimer += Time.deltaTime;
        else detectTimer = Mathf.Max(0, detectTimer - Time.deltaTime);

        bool nowDetected = detectTimer >= need;
        if (nowDetected) { p.isDetected = true; detectTimer = need; }
        else if (p.isDetected && detectTimer <= 0f) p.isDetected = false;
    }

    // Within 1.5 units and behind an unaware guard => instant knockout.
    bool TryTakedown(PlayerController p)
    {
        if (p.isHiding || detectTimer > 0f) return false;
        Vector3 fromGuard = p.transform.position - transform.position; fromGuard.y = 0;
        if (fromGuard.magnitude > 1.5f) return false;
        if (Vector3.Dot(transform.forward, fromGuard.normalized) > -0.3f) return false; // must be behind
        KnockOut();
        return true;
    }

    public void KnockOut()
    {
        isDown = true;
        transform.rotation = Quaternion.Euler(90, transform.eulerAngles.y, 0); // flat "ragdoll-free" pose
        GameState.I.AddCash(cashDrop);
        OnKnockedOut?.Invoke(this);
    }

    public void Stun(float seconds) { stunTimer = seconds; detectTimer = 0; }

    void Patrol()
    {
        if (waypoints == null || waypoints.Length == 0) return;
        Vector3 target = waypoints[wp].position; target.y = transform.position.y;
        Vector3 dir = target - transform.position;
        if (dir.magnitude < 0.2f) { wp = (wp + 1) % waypoints.Length; return; }
        transform.forward = dir.normalized;
        transform.position += dir.normalized * speed * Time.deltaTime;
    }
}
