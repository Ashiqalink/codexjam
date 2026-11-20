using UnityEngine;

/// <summary>Kinematic movement via CharacterController. No Rigidbody. Movement is camera-relative for the iso view.</summary>
[RequireComponent(typeof(CharacterController), typeof(FloorActor))]
public class PlayerController : MonoBehaviour
{
    public static PlayerController I { get; private set; }

    public float speed = 5f;
    public bool isHiding;
    public bool isDetected;
    public FloorActor floor;
    public MeleeWeapon weapon;

    CharacterController cc;

    void Awake()
    {
        I = this;
        cc = GetComponent<CharacterController>();
        floor = GetComponent<FloorActor>();
    }

    void Update()
    {
        if (GameState.I.inCutscene || isHiding) return;

        // Camera yaw is fixed at 35 deg, so rotate input by it.
        Vector3 input = new Vector3(Input.GetAxisRaw("Horizontal"), 0, Input.GetAxisRaw("Vertical")).normalized;
        Vector3 move = Quaternion.Euler(0, 35f, 0) * input;
        if (move.sqrMagnitude > 0.01f)
        {
            transform.forward = move;
            cc.Move(move * speed * Time.deltaTime);
            var p = transform.position; p.y = floorY(p.y); transform.position = p;
        }
    }

    float floorY(float y) => y; // Y is only changed by FloorActor.SetFloor.
}
