'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import { Button, Input } from '@heroui/react';
import toast, { Toaster } from 'react-hot-toast';
import { fetchComments, createComment, deleteComment, Comment } from '../lib/api';

// Helper component for bridging Formik with HeroUI Input
interface TextFieldProps {
  name: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  isInvalid: boolean;
  errorMessage: string | undefined;
}

const TextField: React.FC<TextFieldProps> = ({
  name,
  label,
  placeholder,
  value,
  onChange,
  isInvalid,
  errorMessage,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      <Input
        name={name}
        label={label}
        placeholder={placeholder}
        value={value}
        onValueChange={onChange}
        isInvalid={isInvalid}
        errorMessage={errorMessage}
        variant="bordered"
        classNames={{
          input: 'text-white',
          label: 'text-slate-400',
        }}
      />
    </div>
  );
};

export default function CommentsManager() {
  const qc = useQueryClient();

  // useQuery to fetch current comments list
  const { data: comments, isPending, isError, error } = useQuery<Comment[]>({
    queryKey: ['comments'],
    queryFn: fetchComments,
  });

  // useMutation for adding a comment
  const addMutation = useMutation({
    mutationFn: createComment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments'] });
    },
  });

  // useMutation for deleting a comment
  const removeMutation = useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments'] });
      toast.success('Comment deleted successfully!');
    },
    onError: (err: any) => {
      toast.error(`Failed to delete comment: ${err.message}`);
    },
  });

  // useFormik for client-side validation and submit handling
  const formik = useFormik({
    initialValues: {
      author: '',
      body: '',
    },
    validate: (values) => {
      const errors: { author?: string; body?: string } = {};
      if (!values.author.trim()) {
        errors.author = 'Author is required';
      }
      if (!values.body.trim()) {
        errors.body = 'Comment body is required';
      }
      return errors;
    },
    onSubmit: (values, { resetForm }) => {
      addMutation.mutate(values, {
        onSuccess: () => {
          resetForm();
          toast.success('Comment added successfully!');
        },
        onError: (err: any) => {
          toast.error(`Failed to add comment: ${err.message}`);
        },
      });
    },
  });

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '24px', backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)', fontFamily: 'sans-serif' }}>
      <Toaster position="top-right" />
      <h2 style={{ color: '#f8fafc', marginBottom: '24px', fontWeight: 600, fontSize: '1.4rem' }}>Comments Manager</h2>

      {/* Add Comment Form */}
      <form onSubmit={formik.handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        <TextField
          name="author"
          label="Author"
          placeholder="Your name"
          value={formik.values.author}
          onChange={(v: string) => formik.setFieldValue('author', v)}
          isInvalid={!!(formik.touched.author && formik.errors.author)}
          errorMessage={formik.errors.author}
        />

        <TextField
          name="body"
          label="Comment"
          placeholder="Write a comment..."
          value={formik.values.body}
          onChange={(v: string) => formik.setFieldValue('body', v)}
          isInvalid={!!(formik.touched.body && formik.errors.body)}
          errorMessage={formik.errors.body}
        />

        <Button
          type="submit"
          color="primary"
          disabled={addMutation.isPending}
          style={{ width: '100%', fontWeight: 600 }}
        >
          {addMutation.isPending ? 'Adding...' : 'Add Comment'}
        </Button>
      </form>

      <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '32px' }} />

      {/* Comments List */}
      <h3 style={{ color: '#f8fafc', fontSize: '1.1rem', marginBottom: '16px', fontWeight: 600 }}>All Comments</h3>
      
      {isPending ? (
        <div data-testid="comments-loading" style={{ color: '#94a3b8' }}>Loading comments...</div>
      ) : isError ? (
        <div data-testid="comments-error" style={{ color: '#f87171' }}>Error: {(error as Error).message}</div>
      ) : (
        <ul data-testid="comments-list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {comments.length === 0 ? (
            <li style={{ color: '#64748b', fontStyle: 'italic' }}>No comments yet. Be the first to write one!</li>
          ) : (
            comments.map((comment) => (
              <li
                key={comment.id}
                data-testid={`comment-${comment.id}`}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
              >
                <div>
                  <strong style={{ color: '#a5b4fc', fontSize: '0.95rem' }}>{comment.author}</strong>
                  <p style={{ color: '#f8fafc', margin: '4px 0 0 0', fontSize: '0.9rem', wordBreak: 'break-word' }}>{comment.body}</p>
                </div>
                <Button
                  data-testid={`delete-${comment.id}`}
                  onPress={() => removeMutation.mutate(comment.id)}
                  color="danger"
                  size="sm"
                  disabled={removeMutation.isPending}
                  style={{ fontWeight: 600, marginLeft: '16px' }}
                >
                  Delete
                </Button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
