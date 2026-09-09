<?php

namespace App\Support;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Throwable;

/**
 * One JSON error shape for the whole API:
 *
 *   { "message": "...", "errors": { field: [..] }, "code": "snake_case_slug" }
 *
 * `errors` is present only for validation failures. Stack traces / SQL / paths
 * are never leaked (Laravel's debug output is bypassed here).
 */
class ApiErrorResponse
{
    public static function make(Throwable $e, Request $request): ?JsonResponse
    {
        if (! $request->is('api/*') && ! $request->expectsJson()) {
            return null;
        }

        [$status, $code, $message, $errors] = self::classify($e);

        $payload = ['message' => $message, 'code' => $code];
        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        return response()->json($payload, $status);
    }

    /** @return array{0:int,1:string,2:string,3:?array} */
    private static function classify(Throwable $e): array
    {
        return match (true) {
            $e instanceof ValidationException => [
                $e->status, 'validation_error', $e->getMessage(), $e->errors(),
            ],
            $e instanceof AuthenticationException => [
                401, 'unauthenticated', 'Unauthenticated.', null,
            ],
            $e instanceof TokenMismatchException => [
                419, 'session_expired', 'Your session has expired. Refresh the page and try again.', null,
            ],
            $e instanceof AuthorizationException || $e instanceof AccessDeniedHttpException => [
                403, 'forbidden', $e->getMessage() ?: 'This action is not allowed.', null,
            ],
            $e instanceof ModelNotFoundException || $e instanceof NotFoundHttpException => [
                404, 'not_found', 'The requested resource was not found.', null,
            ],
            $e instanceof TooManyRequestsHttpException => [
                429, 'too_many_requests', $e->getMessage() ?: 'Too many requests. Please slow down.', null,
            ],
            $e instanceof HttpExceptionInterface => [
                $e->getStatusCode(),
                match ($e->getStatusCode()) {
                    401 => 'unauthenticated',
                    403 => 'forbidden',
                    404 => 'not_found',
                    405 => 'method_not_allowed',
                    419 => 'session_expired',
                    429 => 'too_many_requests',
                    default => 'http_'.$e->getStatusCode(),
                },
                $e->getMessage() ?: 'Request failed.',
                null,
            ],
            default => [
                500,
                'server_error',
                config('app.debug') ? $e->getMessage() : 'Something went wrong on our side.',
                null,
            ],
        };
    }
}
