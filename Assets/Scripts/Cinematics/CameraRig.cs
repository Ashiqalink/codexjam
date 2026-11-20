using UnityEngine;

/// <summary>
/// Fixed-angle orthographic camera (45 down, 35 yaw). Only the focus point and zoom ever change,
/// so cinematic shots stay in the same iso language as gameplay.
/// </summary>
[RequireComponent(typeof(Camera))]
public class CameraRig : MonoBehaviour
{
    public static CameraRig I { get; private set; }

    public Transform followTarget;
    public float gameplayOrthoSize = 7f;
    public float distance = 30f;
    public float followSmoothing = 8f;

    [HideInInspector] public bool cinematicControl;
    [HideInInspector] public Vector3 focus;
    [HideInInspector] public float orthoSize;

    Camera cam;

    void Awake()
    {
        I = this;
        cam = GetComponent<Camera>();
        cam.orthographic = true;
        transform.rotation = Quaternion.Euler(45f, 35f, 0f);
        orthoSize = gameplayOrthoSize;
        if (followTarget) focus = followTarget.position;
    }

    void LateUpdate()
    {
        if (!cinematicControl && followTarget)
        {
            focus = Vector3.Lerp(focus, followTarget.position, 1f - Mathf.Exp(-followSmoothing * Time.deltaTime));
            orthoSize = Mathf.Lerp(orthoSize, gameplayOrthoSize, 1f - Mathf.Exp(-followSmoothing * Time.deltaTime));
        }
        cam.orthographicSize = orthoSize;
        transform.position = focus - transform.forward * distance;
    }
}
